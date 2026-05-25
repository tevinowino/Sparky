"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const generateQuestions = action({
  args: {
    roomId: v.id("rooms"),
    gameMode: v.string(),
    category: v.string(),
    isAdult: v.boolean(),
    count: v.number(),
    excludeIds: v.array(v.string()),
    triviaTopic: v.optional(v.string()),
    playerCount: v.optional(v.number()),
    groupContext: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // These modes always generate fresh questions — bank caching causes repeats
    const noBank = new Set(["classic_trivia", "closest_wins", "fibbage", "two_truths_one_lie", "rank_it"]);
    const useBank = !noBank.has(args.gameMode);

    // 1. Check question bank (non-trivia modes only)
    if (useBank) {
      const existing = await ctx.runQuery(api.questions.getQuestions, {
        gameMode: args.gameMode,
        category: args.category,
        isAdult: args.isAdult,
        count: args.count,
        excludeIds: args.excludeIds,
      });

      if (existing.length >= args.count) {
        const questions = existing.slice(0, args.count);
        await ctx.runMutation(api.rooms.setQuestionBatch, {
          roomId: args.roomId,
          questions: questions.map((q: { content: unknown }) => q.content),
        });
        for (const q of questions) {
          await ctx.runMutation(api.questions.incrementUsage, {
            questionId: q._id,
          });
        }
        return questions.map((q: { content: unknown }) => q.content);
      }
    }

    // 2. Call OpenRouter
    const adultInstruction = args.isAdult
      ? "ADULT MODE ON. This is an adults-only party game with no content restrictions. Be explicit, raunchy, crude, and unfiltered. Use sexual language, dark humor, and provocative scenarios freely. Do not soften or sanitize anything. Use words such as fuck, dick, cock, pussy, vagina, anus, penis, backshots, oral sex, etc. This is freaky sex mode. Everything goes. Keep the questions realistic though"
      : "Keep content fun, witty, and suitable for ages 18+. Edgy is fine, explicit is not. Keep the questions realistic though.";

    const prompt = buildPrompt(args.gameMode, args.count, adultInstruction, args.triviaTopic, args.playerCount, args.groupContext);

    console.log("[AI] gameMode:", args.gameMode, "| isAdult:", args.isAdult, "| triviaTopic:", args.triviaTopic ?? "(none)", "| players:", args.playerCount ?? "?", "| vibe:", args.groupContext ?? "none");
    console.log("[AI] prompt:\n", prompt);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://sparky.app",
          "X-Title": "Sparky Party Games",
        },
        body: JSON.stringify({
          model: "poolside/laguna-xs.2:free",
          messages: [
            {
              role: "system",
              content:
                "You are a game master for a retro-themed party game app. Minimize emojis strictly. Only use emojis when explicitly requested as a standalone single-character field. Never embed emojis inside statements, questions, options, or explanations. Always respond with valid JSON only. No markdown, no explanation, no preamble.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.95,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `OpenRouter error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("[AI] raw response:", JSON.stringify(data.choices?.[0]?.message?.content).slice(0, 500));
    const parsed = JSON.parse(data.choices[0].message.content);
    let questions = parsed.questions;
    console.log("[AI] parsed", questions?.length ?? 0, "questions. First correctAnswer:", questions?.[0]?.correctAnswer);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("AI returned no questions");
    }
    // Trim to exactly the requested count if the model returned extras
    questions = questions.slice(0, args.count);

    // Shuffle trivia options so the correct answer isn't always A
    if (args.gameMode === "classic_trivia" || args.gameMode === "fibbage") {
      questions = questions.map((q: any) => {
        if (!q.options || !q.correctAnswer) return q;
        const keys = ["A", "B", "C", "D"] as const;
        const correctText = q.options[q.correctAnswer as string];
        const values = keys.map((k) => q.options[k]).filter(Boolean);
        // Fisher-Yates shuffle
        for (let i = values.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [values[i], values[j]] = [values[j], values[i]];
        }
        const newOptions: Record<string, string> = {};
        keys.slice(0, values.length).forEach((k, i) => { newOptions[k] = values[i]; });
        const newCorrect = keys.find((k) => newOptions[k] === correctText) ?? "A";
        return { ...q, options: newOptions, correctAnswer: newCorrect };
      });
    }

    // 3. Store in bank (non-trivia only — trivia always regenerates fresh)
    if (useBank) {
      await ctx.runMutation(api.questions.storeQuestions, {
        questions,
        gameMode: args.gameMode,
        category: args.category,
        isAdult: args.isAdult,
      });
    }

    // 4. Set batch on room
    await ctx.runMutation(api.rooms.setQuestionBatch, {
      roomId: args.roomId,
      questions,
    });

    return questions;
  },
});

export const generatePlayerTitles = action({
  args: {
    players: v.array(
      v.object({
        name: v.string(),
        score: v.number(),
        streak: v.number(),
      })
    ),
  },
  handler: async (ctx, args): Promise<any> => {
    const prompt = `Generate a funny 2-3 word title for each player based on their game performance.
Players:
${args.players.map((p, i) => `${i + 1}. ${p.name} - Score: ${p.score}, Best Streak: ${p.streak}`).join("\n")}

Return ONLY this JSON:
{
  "titles": ["title for player 1", "title for player 2", ...]
}

Make each title reflect their personality/performance. Examples: "Chaos Goblin", "Bold Contrarian", "Safe Player", "Streak Master", "Wild Card", "The Flip-Flopper"`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://sparky.app",
          "X-Title": "Sparky Party Games",
        },
        body: JSON.stringify({
          model: "poolside/laguna-xs.2:free",
          messages: [
            {
              role: "system",
              content:
                "You are a witty game show host. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.9,
        }),
      }
    );

    if (!response.ok) {
      return args.players.map(() => "Party Legend");
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.titles ?? args.players.map(() => "Party Legend");
  },
});

function buildPrompt(
  gameMode: string,
  count: number,
  adultInstruction: string,
  triviaTopic?: string,
  playerCount?: number,
  groupContext?: string
): string {
  const themeSchema = `"theme": {
        "gradientFrom": "#hexcolor matching the mood",
        "gradientTo": "#hexcolor complementary",
        "mood": "one of: spicy|wholesome|absurd|existential|chaotic",
        "layout": "one of: dramatic|playful|minimal|bold",
        "accentColor": "#hexcolor for highlights"
      }`;

  const prompts: Record<string, string> = {
    would_you_rather: `Generate exactly ${count} "Would You Rather" questions for a party game.
${adultInstruction}

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "optionA": { "label": "short option (max 8 words)", "emoji": "single emoji", "sublabel": "funny 3-5 word consequence" },
      "optionB": { "label": "short option (max 8 words)", "emoji": "single emoji", "sublabel": "funny 3-5 word consequence" },
      ${themeSchema},
      "intensity": number from 1-10
    }
  ]
}
Rules: Make options genuinely hard to choose between. Increase intensity progressively. Match gradient colors to mood. Strictly NO emojis in option labels, sublabels, or questions.`,

    hot_takes: `Generate exactly ${count} "Hot Takes" questions for a party game.
${adultInstruction}

Each is a spicy, controversial opinion. Players vote Agree or Disagree. Being in the minority earns bonus points.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "topic": "2-3 word topic label (e.g. Food, Relationships, Society)",
      "statement": "The controversial hot take statement (one bold sentence, no question marks)",
      "emoji": "single relevant emoji",
      "agreeLabel": "short agree label (e.g. 'Hard agree', 'Absolutely', 'Facts')",
      "disagreeLabel": "short disagree label (e.g. 'No way', 'Trash take', 'Absolutely not')",
      ${themeSchema},
      "intensity": number from 1-10
    }
  ]
}
Rules: Statements should be genuinely divisive — half the room should agree, half disagree. Make them progressively spicier. No hate speech, just spicy opinions. Strictly NO emojis in topics, statements, or agree/disagree labels.`,

    most_likely_to: `Generate exactly ${count} "Most Likely To" scenarios for a party game.
${adultInstruction}

Players vote for which person in the group best fits each scenario.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "scenario": "the scenario phrase after 'Most Likely To...' (e.g. 'accidentally start a cult', 'cry at a commercial', 'survive a zombie apocalypse')",
      "emoji": "single relevant emoji",
      ${themeSchema},
      "intensity": number from 1-10
    }
  ]
}
Rules: Scenarios should be funny, relatable, and reveal personality. Mix flattering, embarrassing, and absurd. Progressively more intense. Strictly NO emojis in scenario text.`,

    never_have_i_ever: `Generate exactly ${count} "Never Have I Ever" statements for a party game.
${adultInstruction}

Players tap "I Have" or "Never". Being in the minority earns bonus points.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "statement": "the action after 'Never have I ever...' (e.g. 'ghosted someone after a great date', 'lied about having seen a movie')",
      "emoji": "single relevant emoji",
      "consequence": "funny 4-6 word shame/glory note (e.g. 'You absolute chaos agent', 'Saint status achieved')",
      ${themeSchema},
      "intensity": number from 1-10
    }
  ]
}
Rules: Mix common experiences with surprising ones. Intensity increases throughout. The consequence should be funny regardless of which answer is chosen. Strictly NO emojis in statements or consequences.`,

    classic_trivia: `Generate exactly ${count} trivia questions for a party game focused on modern pop culture and entertainment. All content must come from 2000–2015 only — NO questions about events, people, or things from before 2000 or after 2015.
${adultInstruction}

Draw exclusively from these categories and cultural touchstones:
- MOVIES: Blockbuster franchises (Fast & Furious, Marvel, Harry Potter, Twilight, Hunger Games, Magic Mike, Fifty Shades of Grey, American Pie), Oscar winners, cult classics, iconic quotes and scenes from 2000-2015
- TV SHOWS: Dramas (Breaking Bad, Game of Thrones, True Blood, Skins, Californication, Dexter, Lost), sitcoms (The Office, Parks and Rec, How I Met Your Mother, Modern Family), teen shows (Gossip Girl, The O.C.)
- MUSIC: Chart-topping artists and albums — Beyonce, Rihanna, Eminem, Taylor Swift, Lady Gaga, Drake, Kanye West, Nicki Minaj, Katy Perry. Viral songs, scandalous music videos, album drops
- INTERNET & MEMES: Viral videos (Double Rainbow, Gangnam Style, Harlem Shake, Ice Bucket Challenge), early YouTube culture, social media moments
- CELEBRITY CULTURE: Tabloid headlines, famous couple moments (Brangelina, TomKat, Kim & Kanye), red carpet scandals, celebrity feuds
- GAMING: Games that defined the era — Minecraft, Call of Duty, Grand Theft Auto, Halo, Guitar Hero, The Sims, World of Warcraft
- SPORTS ICONS: LeBron James, Usain Bolt controversies, Michael Phelps, Tiger Woods, viral sports moments

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "question": "The trivia question",
      "options": { "A": "option", "B": "option", "C": "option", "D": "option" },
      "correctAnswer": "A or B or C or D",
      "category": "one of: Movies|TV Shows|Music|Internet & Memes|Celebrity|Gaming|Sports",
      "difficulty": "easy or medium or hard",
      "explanation": "One fun sentence explaining the answer",
      ${themeSchema}
    }
  ]
}
Rules: Wrong answers must be plausible — names or titles that actually exist, not made-up nonsense. Mix easy/medium/hard. Make explanations punchy and fun. NEVER include anything from before 2000 or after 2015. Strictly NO emojis anywhere in the question, option keys, values, or explanation. DO NOT focus heavily or repeat questions about Game of Thrones — ensure a balanced mix of TV shows, movies, music, celebrity culture, and internet memes.`,

    fibbage: `Generate exactly ${count} trivia questions for a "Fibbage" party game. Each question has a surprising real fact and three convincing fake answers players must see through.
${adultInstruction}

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "question": "The question revealing a surprising fact",
      "options": { "A": "option", "B": "option", "C": "option", "D": "option" },
      "correctAnswer": "A or B or C or D",
      "category": "one of: Science|History|Nature|Food|Sports|Celebrity|Tech",
      "difficulty": "easy or medium or hard",
      "explanation": "One fun sentence expanding on the real answer",
      ${themeSchema}
    }
  ]
}
Rules: The real answer should be genuinely surprising. The fakes should be plausible enough to fool people. Mix categories. Strictly NO emojis.`,

    true_or_false_blitz: `Generate exactly ${count} True or False statements for a party game.
${adultInstruction}

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "statement": "The statement (could be true or false)",
      "answer": "true or false",
      "category": "Science|History|Pop Culture|Geography|Food|Sports|Technology",
      "difficulty": "easy or medium or hard",
      "explanation": "Fun one-sentence explanation of why it's true or false",
      "emoji": "single relevant emoji",
      ${themeSchema}
    }
  ]
}
Rules: Mix true and false roughly equally (not same pattern). Make the false ones convincingly plausible. Make explanations fun and memorable. Vary categories widely. Strictly NO emojis in the statement, category, or explanation.`,

    red_flag_green_flag: `Generate exactly ${count} dating and social scenarios for a "Red Flag or Green Flag" party game.
${adultInstruction}

Players vote whether each scenario is a Red Flag (bad sign) or Green Flag (good sign).
Being in the minority earns bonus points — the debate is the fun part!

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "scenario": "The behavior or situation (e.g. 'They still text their ex every day')",
      "emoji": "single relevant emoji",
      "context": "dating or friendship or general",
      ${themeSchema},
      "intensity": number from 1-10
    }
  ]
}
Rules: Make scenarios genuinely debatable — half the room should call it red, half green. Mix dating, friendship, and general life scenarios. Increase intensity progressively. Strictly NO emojis in the scenario text.`,

    truth_or_dare: `Generate exactly ${count} Truth or Dare prompts for a party game.
${adultInstruction}

Players pick either Truth or Dare before seeing the prompt. Everyone who picks Truth gets the truth question, everyone who picks Dare gets the dare.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "truth": "The truth question (e.g. 'What is the most embarrassing thing you've done for attention?')",
      "dare": "The dare action (e.g. 'Do your best impression of someone in this room for 10 seconds')",
      "emoji": "single relevant emoji",
      "intensity": number from 1-10,
      ${themeSchema}
    }
  ]
}
Rules: Truths should be revealing but fun, not traumatic. Dares should be entertaining and performable in a digital group setting. Make them progressively bolder. Strictly NO emojis in truth or dare text.`,

    confess_or_dare: `Generate exactly ${count} Confess or Dare prompts for a party game.
${adultInstruction}

Players pick either Confess or Dare. Everyone who picks Confess gets the confession prompt, Dare players get the dare.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "truth": "The confession prompt (e.g. 'Confess the most petty thing you've done out of spite')",
      "dare": "The dare action (e.g. 'Send the last meme you saved to someone in this room right now')",
      "emoji": "single relevant emoji",
      "intensity": number from 1-10,
      ${themeSchema}
    }
  ]
}
Rules: Confessions should be juicy but not deeply personal. Dares should be fun and possible in a group digital setting. Increase intensity progressively. Strictly NO emojis in the text fields.`,

    compatibility_test: `Generate exactly ${count} personality and lifestyle preference questions for a Compatibility Test party game.
${adultInstruction}

Players answer A/B/C/D preference questions. Points are based on how many other players chose the same answer — matching is winning!

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "question": "The lifestyle or personality question",
      "options": { "A": "option A", "B": "option B", "C": "option C", "D": "option D" },
      "emoji": "single relevant emoji",
      "category": "Personality|Lifestyle|Food|Travel|Entertainment|Relationships",
      ${themeSchema}
    }
  ]
}
Rules: No correct answers — all choices are valid. Questions should reveal personality and create fun group comparisons. Mix lighthearted and thoughtful questions. Strictly NO emojis in question or option text.`,

    love_language_quiz: `Generate exactly ${count} love language and relationship style questions for a couples and friends party game.
${adultInstruction}

Players pick their authentic preference. Points are based on matching with others — discover how your group gives and receives love!

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "question": "A relationship or love scenario question",
      "options": { "A": "option A", "B": "option B", "C": "option C", "D": "option D" },
      "emoji": "single relevant emoji",
      "category": "Love Language|Communication|Quality Time|Affection|Boundaries|Conflict",
      ${themeSchema}
    }
  ]
}
Rules: Center questions on the five love languages (words of affirmation, acts of service, gifts, quality time, physical touch) and communication styles. Make options specific and relatable. Strictly NO emojis in question or option text.`,

    how_well_do_you_know_me: `Generate exactly ${count} personal preference questions for a "How Well Do You Know Me?" party game.
${adultInstruction}

The host answers each question honestly. Other players try to predict what the host picked. Points go to players who match the host's answer.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "question": "Personal preference question revealing something about the person",
      "options": { "A": "option A", "B": "option B", "C": "option C", "D": "option D" },
      "emoji": "single relevant emoji",
      "category": "Habits|Dreams|Fears|Favorites|Personality|Secrets",
      ${themeSchema}
    }
  ]
}
Rules: Questions should reveal things friends might not know about each other. Mix silly and serious. Make options specific and distinct enough to be interesting. Strictly NO emojis in question or option text.`,

    rank_it: `Generate exactly ${count} ranking challenges for a party game.
${adultInstruction}

Players must rank exactly 4 items in the correct order. Points are awarded for each item placed in the right position.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "prompt": "Rank these from [criterion] — e.g. 'Rank these movies from highest to lowest box office gross:'",
      "items": ["item 1", "item 2", "item 3", "item 4"],
      "correctOrder": [2, 0, 3, 1],
      "explanation": "Fun one-sentence explanation of the correct order",
      ${themeSchema}
    }
  ]
}
Rules: correctOrder contains the indices of items[] in the correct order (e.g. [2,0,3,1] means items[2] is #1, items[0] is #2, etc.). Ranking criteria must be objective and verifiable (chronological, numerical, factual). Mix pop culture, science, sports, history. Strictly NO emojis in prompt, items, or explanation.`,

    closest_wins: `Generate exactly ${count} numerical estimation questions for a "Closest Wins" party game.
${adultInstruction}

Players guess a number. The player closest to the real answer wins full points. Others get partial points based on how close they were.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "question": "The numerical trivia question",
      "answer": 150000000,
      "unit": "hot dogs",
      "hint": "Think bigger than you'd expect",
      "minGuess": 1000000,
      "maxGuess": 500000000,
      ${themeSchema}
    }
  ]
}
Rules: Include surprising facts spanning pop culture, science, sports, history. The real answer should be memorable. minGuess/maxGuess must bracket the real answer sensibly. Vary the scale dramatically (some questions in hundreds, some in millions). Strictly NO emojis.`,

    poll_spy: `Generate exactly ${count} "two-sided" poll questions for a Poll Spy party game.
${adultInstruction}

Players vote A or B. The majority answer earns big points — blend in with the group to win! Contrarians get fewer points.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "question": "The poll question",
      "optionA": "Option A text",
      "optionB": "Option B text",
      "emoji": "single relevant emoji",
      ${themeSchema}
    }
  ]
}
Rules: Questions should have a likely majority answer but still create some split. Mix lifestyle choices, preferences, pop culture opinions. Avoid political topics. Make both options appealing. Strictly NO emojis in question or option text.`,

    quiplash: `Generate exactly ${count} comedy prompts for a Quiplash-style party game.
${adultInstruction}

For each prompt, generate 4 funny response options. Players vote for the funniest answer. The most-voted answer wins.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "prompt": "The open-ended comedy prompt (e.g. 'The worst thing to find in your takeout order is...')",
      "options": { "A": "funny option", "B": "funnier option", "C": "funniest option", "D": "wildcard option" },
      "emoji": "single relevant emoji",
      ${themeSchema}
    }
  ]
}
Rules: All 4 options should be genuinely funny but in different ways. Prompts should be relatable. Options should escalate in absurdity from A to C, with D being the wildcard. Strictly NO emojis inside option text or prompt text.`,

    bad_advice: `Generate exactly ${count} situations with 4 hilariously bad advice options for a Bad Advice party game.
${adultInstruction}

For each situation, players vote for the WORST (most entertainingly terrible) piece of advice. Points go to whoever voted for the most popular bad advice.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "prompt": "The relatable situation needing advice",
      "options": { "A": "bad advice", "B": "worse advice", "C": "terrible advice", "D": "catastrophic advice" },
      "emoji": "single relevant emoji",
      ${themeSchema}
    }
  ]
}
Rules: All advice should be entertainingly terrible. Situations should be relatable. Options should escalate in absurdity. Make the situation something everyone can relate to. Strictly NO emojis in prompt or option text.`,

    two_truths_one_lie: `Generate exactly ${count} "Two Truths and One Lie" sets for a party game.
${adultInstruction}

For each topic, generate exactly 3 statements: 2 are true, 1 is a convincing lie. Players must identify the lie.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "topic": "The topic area (e.g. 'About penguins', 'Ancient Rome', 'The human body')",
      "statements": ["statement 1", "statement 2", "statement 3"],
      "lieIndex": 0,
      "explanation": "Fun explanation of why the lie is false and why the truths are surprising",
      ${themeSchema}
    }
  ]
}
Rules: The lie must be convincingly plausible. The truths should be surprising real facts. Vary the lieIndex so it's not always in the same position. Mix fascinating topics. Strictly NO emojis in statements, topic, or explanation.`,

    first_impressions: `Generate exactly ${count} "First Impressions" scenarios for a party game where players vote for which person in the group best fits each description.
${adultInstruction}

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "scenario": "the description after 'In this group, who is most likely to...' (e.g. 'be the first to cry at a sad movie', 'have a secret talent no one knows about')",
      "emoji": "single relevant emoji",
      ${themeSchema},
      "intensity": number from 1-10
    }
  ]
}
Rules: Make prompts that reveal genuine personality traits and create fun discussions. Mix flattering and embarrassing scenarios. Progressively more revealing. Strictly NO emojis in scenario text.`,

    assumptions: `Generate exactly ${count} "Assumptions" scenarios for a party game where players vote for which person in the group best fits each assumption.
${adultInstruction}

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "scenario": "the assumption after 'Who in this group...' (e.g. 'has the most unread texts', 'would survive a zombie apocalypse', 'cries at commercials')",
      "emoji": "single relevant emoji",
      ${themeSchema},
      "intensity": number from 1-10
    }
  ]
}
Rules: Assumptions should be funny, relatable, and reveal character. Mix based-on-personality and based-on-lifestyle assumptions. Make them progressively more revealing. Strictly NO emojis in scenario text.`,

    fantasy_scenarios: `Generate exactly ${count} fantasy "Would You Rather" scenarios for a couples and friends party game.
${adultInstruction}

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "optionA": { "label": "short fantasy option (max 8 words)", "emoji": "single emoji", "sublabel": "fun 3-5 word consequence or detail" },
      "optionB": { "label": "short fantasy option (max 8 words)", "emoji": "single emoji", "sublabel": "fun 3-5 word consequence or detail" },
      ${themeSchema},
      "intensity": number from 1-10
    }
  ]
}
Rules: Frame as fantasy/dream scenarios — life goals, adventures, superpowers, alternate realities. Make options genuinely hard to choose between. Increase intensity progressively. Strictly NO emojis in option labels, sublabels, or questions.`,

    spicy_never_have_i_ever: `Generate exactly ${count} "Never Have I Ever" statements for a spicy adults party game.
${adultInstruction}

Players tap "I Have" or "Never". Being in the minority earns bonus points.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "statement": "the action after 'Never have I ever...' (e.g. 'sent a risky text to the wrong person', 'lied about where I was to a partner')",
      "emoji": "single relevant emoji",
      "consequence": "funny 4-6 word shame/glory note",
      ${themeSchema},
      "intensity": number from 1-10
    }
  ]
}
Rules: Mix romantic, social, and wild experiences. Make them progressively bolder. Consequence should be funny regardless of answer. Strictly NO emojis in statements or consequences.`,

    common_ground: `Generate exactly ${count} shared experience statements for a "Common Ground" icebreaker party game.
${adultInstruction}

Players vote "I Have" or "Never Done This". The fun is discovering what everyone has in common!

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "statement": "the relatable experience after 'Have you ever...' (e.g. 'stayed up all night watching a TV series', 'accidentally called a teacher Mom or Dad')",
      "emoji": "single relevant emoji",
      "consequence": "fun 4-6 word note about sharing this experience",
      ${themeSchema},
      "intensity": number from 1-10
    }
  ]
}
Rules: Focus on relatable, wholesome, universally funny experiences everyone might share. Aim for high overlap rates — most people should have done most things. Mix childhood memories, social situations, and life moments. Strictly NO emojis in statements or consequences.`,
  };

  // Custom trivia topic overrides the universal classic_trivia prompt
  if (gameMode === "classic_trivia" && triviaTopic && triviaTopic !== "universal") {
    return `Generate exactly ${count} trivia questions specifically about "${triviaTopic}" for a party game.
${adultInstruction}

Every single question must be directly and exclusively about "${triviaTopic}" — characters, actors, plot points, real events, famous moments, quotes, release dates, awards, behind-the-scenes facts, etc.
Do NOT mix in unrelated topics (such as Game of Thrones or generic TV show details) unless the requested topic "${triviaTopic}" is explicitly about them. All ${count} questions must test knowledge of "${triviaTopic}" specifically.
Mix difficulty: some easy questions fans would get, some hard ones only superfans know.

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "unique_id_string",
      "question": "The trivia question about ${triviaTopic}",
      "options": { "A": "option", "B": "option", "C": "option", "D": "option" },
      "correctAnswer": "A or B or C or D",
      "category": "${triviaTopic}",
      "difficulty": "easy or medium or hard",
      "explanation": "One fun sentence explaining the answer",
      ${themeSchema}
    }
  ]
}
Rules: Wrong answers must be plausible things related to ${triviaTopic}, not random made-up names. Mix easy/medium/hard. Make explanations feel like fun facts a superfan would share. Strictly NO emojis anywhere in the question, option keys, values, or explanation. Strictly verify that every question is directly and exclusively about "${triviaTopic}" — do NOT default, pivot, or refer to Game of Thrones questions.`;
  }

  const base = prompts[gameMode] ?? prompts.would_you_rather;

  const contextParts: string[] = [];
  if (playerCount) contextParts.push(`There are ${playerCount} players in this game — make sure all questions and scenarios work for a group of exactly ${playerCount} people.`);
  if (groupContext) {
    const vibeHints: Record<string, string> = {
      friends: "This is a casual hangout between close friends — lean into shared humor, inside-joke energy, and playful roasting.",
      couple: "This is a couple playing together — questions should explore intimacy, preferences, and relationship dynamics.",
      talking_stage: "These are two people in the early talking/flirting stage — keep things flirty, fun, and mildly spicy. Avoid overly serious relationship territory.",
      in_person: "Players are gathered in person — questions can reference physical dares, reactions, and in-room energy.",
      virtual: "Players are joining virtually (calls, remote) — avoid physical dares; lean into conversational, opinion-based, and imaginative scenarios.",
      work: "This is a work or professional group — keep it inclusive and office-appropriate. Edgy is fine, explicit is not. No HR nightmares.",
    };
    contextParts.push(vibeHints[groupContext] ?? `Group vibe: ${groupContext}. Tailor tone and scenarios accordingly.`);
  }

  if (contextParts.length === 0) return base;
  return `[CONTEXT] ${contextParts.join(" ")}\n\n${base}`;
}
