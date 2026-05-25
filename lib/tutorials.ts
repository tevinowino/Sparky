export interface PointRule {
  label: string;
  value: string;
  desc: string;
}

export interface Tutorial {
  title: string;
  emoji: string;
  tagline: string;
  howToPlay: string[];
  points: PointRule[];
  tip: string;
}

export const TUTORIALS: Record<string, Tutorial> = {
  would_you_rather: {
    title: "Would You Rather",
    emoji: "🤔",
    tagline: "Two choices. No escape.",
    howToPlay: [
      "A dilemma appears with two options — A or B. You must pick one.",
      "Everyone answers at the same time. After the timer (or the host reveals), you see how the room split.",
      "Being in the minority pays more. The crowd answer is safe — the weird answer is profitable.",
    ],
    points: [
      { label: "Majority vote", value: "50 pts", desc: "You chose with most of the room" },
      { label: "Minority vote", value: "150 pts", desc: "You stood alone — contrarian bonus" },
      { label: "Speed bonus", value: "+50 pts", desc: "Answered in the first half of the timer" },
      { label: "3-streak multiplier", value: "×1.5", desc: "3 rounds in a row scoring" },
      { label: "5-streak multiplier", value: "×2.0", desc: "5 rounds in a row — chaos mode" },
    ],
    tip: "If everyone's going to pick A, pick B. The crowd answer is worth the least.",
  },

  hot_takes: {
    title: "Hot Takes",
    emoji: "🔥",
    tagline: "Agree or disagree. No fence-sitting.",
    howToPlay: [
      "A spicy opinion appears on screen. You have seconds to decide: Agree 🔥 or Disagree ❄️.",
      "After everyone votes, the room splits into two camps. The minority earns the jackpot.",
      "The best takes divide the room 50/50 — no one earns minority points, everyone gets base.",
    ],
    points: [
      { label: "Majority vote", value: "50 pts", desc: "Agreed with the crowd" },
      { label: "Minority vote", value: "200 pts", desc: "Held the less popular position" },
      { label: "Speed bonus", value: "+50 pts", desc: "Voted in the first half of the timer" },
    ],
    tip: "If a take feels obvious, the real points are on the other side. Trust your gut.",
  },

  most_likely_to: {
    title: "Most Likely To",
    emoji: "👑",
    tagline: "Call out your friends. Points follow.",
    howToPlay: [
      "A scenario appears — 'Most likely to...'. Tap the player in the room who fits best.",
      "You cannot vote for yourself. The player with the most votes gets crowned.",
      "Both the crowned player and everyone who voted for them earn points.",
    ],
    points: [
      { label: "Voted for the winner", value: "100 pts", desc: "You called it correctly" },
      { label: "Being voted the winner", value: "200 pts", desc: "Most fingers pointed at you" },
      { label: "Speed bonus", value: "+50 pts", desc: "Voted in the first half of the timer" },
    ],
    tip: "Voting obvious picks is safe. If you think someone unexpected fits perfectly, you might be the only one — and rack up on the next question.",
  },

  never_have_i_ever: {
    title: "Never Have I Ever",
    emoji: "🤫",
    tagline: "Be honest. Or don't. But it costs you.",
    howToPlay: [
      "A 'Never have I ever...' statement appears. Tap 🙋 'I Have' if you've done it, or 🙅 'Never' if you haven't.",
      "After everyone answers, the room is exposed. Who's done what?",
      "The rarer your answer, the more you earn — minority rules here too.",
    ],
    points: [
      { label: "Minority answer", value: "200 pts", desc: "Few others shared your experience" },
      { label: "Majority answer", value: "50 pts", desc: "You were with the crowd" },
      { label: "Speed bonus", value: "+50 pts", desc: "Answered quickly" },
    ],
    tip: "Honesty pays. If everyone else says 'Never' and you've done it — that's 200 points and eternal bragging rights.",
  },

  classic_trivia: {
    title: "Classic Trivia",
    emoji: "🧠",
    tagline: "Right answer. Fast. That's it.",
    howToPlay: [
      "A trivia question appears with four options: A, B, C, D. Pick the right one.",
      "Speed matters — the faster you answer correctly, the more points you earn.",
      "Wrong answers score zero and reset your streak. Think before you tap.",
    ],
    points: [
      { label: "Correct (instant)", value: "1,000 pts", desc: "First second of the 20s timer" },
      { label: "Correct (slow)", value: "100 pts", desc: "Last second of the timer" },
      { label: "Correct (any speed)", value: "100–1,000 pts", desc: "Scales linearly by time remaining" },
      { label: "Wrong answer", value: "0 pts", desc: "Streak also resets to zero" },
    ],
    tip: "A fast wrong answer is strictly worse than a slow right one. Take the extra second.",
  },

  true_or_false_blitz: {
    title: "True or False Blitz",
    emoji: "⚡",
    tagline: "Fast facts. No room for doubt.",
    howToPlay: [
      "A statement appears — is it TRUE or FALSE? You have 15 seconds to decide.",
      "Speed is rewarded: answer correctly early and earn close to 800 points.",
      "Wrong answers score zero and break your streak.",
    ],
    points: [
      { label: "Correct (instant)", value: "800 pts", desc: "Answered immediately" },
      { label: "Correct (slow)", value: "100 pts", desc: "Answered at the last second" },
      { label: "Wrong answer", value: "0 pts", desc: "Streak resets" },
    ],
    tip: "The explanation after each round is a fun fact — pay attention, it might come up again.",
  },

  red_flag_green_flag: {
    title: "Red Flag or Green Flag",
    emoji: "🚩",
    tagline: "Is it a vibe or a warning sign?",
    howToPlay: [
      "A dating or social scenario appears. You decide: 🚩 Red Flag or 🟢 Green Flag?",
      "There's no 'correct' answer — the fun is in the debate. The minority opinion earns bonus points.",
      "The best rounds are 50/50 splits where the room is genuinely divided.",
    ],
    points: [
      { label: "Minority vote", value: "250 pts", desc: "You held the less popular view" },
      { label: "Majority vote", value: "50 pts", desc: "You agreed with the crowd" },
      { label: "Speed bonus", value: "+50 pts", desc: "Voted in the first half of the timer" },
    ],
    tip: "If something feels obviously red or green, the real points are on the other side.",
  },

  truth_or_dare: {
    title: "Truth or Dare",
    emoji: "🎲",
    tagline: "Pick your poison. Then live with it.",
    howToPlay: [
      "Each round, pick TRUTH or DARE before you see what it is.",
      "After you pick, your prompt is revealed — Truth players get a personal question, Dare players get a challenge.",
      "Everyone who answers earns participation points. Boldness is rewarded!",
    ],
    points: [
      { label: "Participation", value: "150 pts", desc: "You picked and answered" },
    ],
    tip: "Picking DARE when everyone else picks TRUTH makes you the wildcard of the room.",
  },

  confess_or_dare: {
    title: "Confess or Dare",
    emoji: "💬",
    tagline: "Spill the tea or take the dare.",
    howToPlay: [
      "Each round, pick CONFESS or DARE before you see what it is.",
      "Confession players share something personal, Dare players take on a challenge.",
      "Everyone earns participation points — it's about the laughs, not the score.",
    ],
    points: [
      { label: "Participation", value: "150 pts", desc: "You picked and engaged" },
    ],
    tip: "The funniest moments come from unexpected confessions. Be brave!",
  },

  compatibility_test: {
    title: "Compatibility Test",
    emoji: "✨",
    tagline: "Are you more alike than you think?",
    howToPlay: [
      "A lifestyle or personality question appears with four options. Pick what fits you most honestly.",
      "There's no wrong answer — points come from matching other players.",
      "The more people who picked the same as you, the more you score!",
    ],
    points: [
      { label: "Per matching player", value: "80 pts", desc: "Each player who chose the same earns you points" },
    ],
    tip: "Don't guess what others will pick — answer honestly. You'll be surprised who you match with.",
  },

  love_language_quiz: {
    title: "Love Language Quiz",
    emoji: "💕",
    tagline: "How do you give and receive love?",
    howToPlay: [
      "Relationship and love scenarios appear with four options. Pick what resonates with you most.",
      "Points come from matching with other players — find your love language twins!",
      "No right answers, just revealing conversations after.",
    ],
    points: [
      { label: "Per matching player", value: "80 pts", desc: "Each player who agrees earns you points" },
    ],
    tip: "This is as much about sparking conversations as it is about scoring. Be honest!",
  },

  how_well_do_you_know_me: {
    title: "How Well Do You Know Me?",
    emoji: "🫶",
    tagline: "The host answers. Can you guess them?",
    howToPlay: [
      "The host answers a personal preference question. Everyone else guesses what the host picked.",
      "If you match the host's answer, you score big! The host earns nothing but respect.",
      "Mix of silly and revealing questions — you might learn something new about your friends.",
    ],
    points: [
      { label: "Match the host", value: "350 pts", desc: "You guessed the host correctly" },
      { label: "Wrong guess", value: "0 pts", desc: "Better luck next round" },
    ],
    tip: "Think about the host's personality, not what you would answer.",
  },

  rank_it: {
    title: "Rank It",
    emoji: "📊",
    tagline: "Order matters. Get it right.",
    howToPlay: [
      "Four items appear — tap them in the correct order based on the ranking criteria.",
      "After tapping all four, lock in your ranking. You earn points for each correctly placed item.",
      "100 points per correct position — get all four right for the maximum 400 points.",
    ],
    points: [
      { label: "Per correct position", value: "100 pts", desc: "Up to 4 positions to get right" },
      { label: "Perfect ranking", value: "400 pts", desc: "All four in the right order" },
    ],
    tip: "If you're unsure about the middle items, nail the first and last — they're usually easiest.",
  },

  closest_wins: {
    title: "Closest Wins",
    emoji: "🎯",
    tagline: "How close can you get?",
    howToPlay: [
      "A numerical question appears — guess a number. Use +/− buttons or type it in.",
      "After the timer, everyone's guesses are revealed alongside the real answer.",
      "The player closest to the real answer wins the round!",
    ],
    points: [
      { label: "Closest guess", value: "600 pts", desc: "You were the nearest to the real answer" },
      { label: "Close guess", value: "300 pts", desc: "Within 50% of the closest player's margin" },
      { label: "Participated", value: "100 pts", desc: "You guessed something" },
    ],
    tip: "Think about orders of magnitude first. Is the answer in thousands? Millions? Start there.",
  },

  poll_spy: {
    title: "Poll Spy",
    emoji: "🕵️",
    tagline: "Blend in. The crowd is your friend.",
    howToPlay: [
      "A poll question appears with two options. Your goal is to vote with the majority.",
      "Unlike other games, the minority gets fewer points here. Think about what most people will say!",
      "Read the room, know your group, and pick what they'd pick.",
    ],
    points: [
      { label: "Majority vote", value: "250 pts", desc: "You blended in with the crowd" },
      { label: "Minority vote", value: "75 pts", desc: "You were in the minority" },
      { label: "Speed bonus", value: "+50 pts", desc: "Answered quickly" },
    ],
    tip: "This is the reverse of Hot Takes — here, conformity wins. Think group psychology.",
  },

  quiplash: {
    title: "Quiplash",
    emoji: "😂",
    tagline: "The funniest answer wins.",
    howToPlay: [
      "A comedy prompt appears with four AI-generated funny responses.",
      "Everyone votes for the funniest option. The most popular answer wins the round!",
      "The highest-voted option earns the top prize — runner-up earns a consolation reward.",
    ],
    points: [
      { label: "Most votes (winner)", value: "400 pts", desc: "Your pick was the group's favorite" },
      { label: "Runner-up", value: "200 pts", desc: "Second most popular pick" },
      { label: "Participated", value: "75 pts", desc: "You voted" },
    ],
    tip: "Pick what you genuinely think is funniest — your sense of humor matters here.",
  },

  bad_advice: {
    title: "Bad Advice",
    emoji: "😈",
    tagline: "The worse, the better.",
    howToPlay: [
      "A relatable problem appears. Four hilariously bad pieces of advice are shown.",
      "Vote for the WORST (most entertainingly terrible) advice option.",
      "The most-voted bad advice wins. Terrible advice is an art form.",
    ],
    points: [
      { label: "Most votes (winner)", value: "400 pts", desc: "Your pick was the group's favorite bad advice" },
      { label: "Runner-up", value: "200 pts", desc: "Second most picked" },
      { label: "Participated", value: "75 pts", desc: "You voted" },
    ],
    tip: "The funniest bad advice usually sounds almost reasonable at first glance.",
  },

  two_truths_one_lie: {
    title: "Two Truths One Lie",
    emoji: "🤥",
    tagline: "One of these is false. Find it.",
    howToPlay: [
      "Three statements appear about a topic. Two are true, one is a convincing lie.",
      "Tap the statement you think is the lie. Speed doesn't matter here — accuracy does.",
      "The reveal shows which one was false and explains why.",
    ],
    points: [
      { label: "Correct (spotted the lie)", value: "400 pts", desc: "You identified the false statement" },
      { label: "Wrong guess", value: "0 pts", desc: "The lie fooled you" },
    ],
    tip: "The lie is usually the most dramatic-sounding claim. But sometimes it's the dull one.",
  },

  first_impressions: {
    title: "First Impressions",
    emoji: "👁️",
    tagline: "Who comes to mind first?",
    howToPlay: [
      "A description appears — 'In this group, who is most likely to...'. Tap a player!",
      "You can't vote for yourself. The player with the most votes earns the crown.",
      "Both the crowned player and their voters earn points.",
    ],
    points: [
      { label: "Voted for the winner", value: "100 pts", desc: "You called it correctly" },
      { label: "Being voted the winner", value: "200 pts", desc: "The group pointed at you" },
      { label: "Speed bonus", value: "+50 pts", desc: "Voted in the first half of the timer" },
    ],
    tip: "Your first instinct is usually right. Don't overthink it.",
  },

  assumptions: {
    title: "Assumptions",
    emoji: "🔮",
    tagline: "Call out your friends. Nicely. Mostly.",
    howToPlay: [
      "An assumption about someone in the group appears. Tap who you think it applies to most!",
      "You can't vote for yourself. Most votes earns the crown and bonus points.",
      "Both the crowned player and their voters earn points.",
    ],
    points: [
      { label: "Voted for the winner", value: "100 pts", desc: "You called it correctly" },
      { label: "Being voted the winner", value: "200 pts", desc: "The assumption fit you best" },
      { label: "Speed bonus", value: "+50 pts", desc: "Voted in the first half of the timer" },
    ],
    tip: "Pick based on personality — not who you want to embarrass.",
  },

  fantasy_scenarios: {
    title: "Fantasy Scenarios",
    emoji: "🌙",
    tagline: "Dream big. Pick bigger.",
    howToPlay: [
      "A fantasy 'Would You Rather' appears — two dream scenarios, and you must pick one.",
      "Being in the minority earns bonus points. The crowd answer is the safe answer.",
      "Mix of life goals, adventures, and alternate realities.",
    ],
    points: [
      { label: "Majority vote", value: "50 pts", desc: "You chose with the crowd" },
      { label: "Minority vote", value: "150 pts", desc: "Your fantasy was less common" },
      { label: "Speed bonus", value: "+50 pts", desc: "Answered quickly" },
    ],
    tip: "Answer honestly about YOUR dream — the minority points add up faster than you'd expect.",
  },

  spicy_never_have_i_ever: {
    title: "Spicy Never Have I Ever",
    emoji: "🌶️",
    tagline: "The unfiltered edition.",
    howToPlay: [
      "A bold 'Never have I ever...' statement appears. Tap 🙋 'I Have' or 🙅 'Never'.",
      "This is the adult version — expect spicier confessions and revelations.",
      "The rarer your answer, the more points you earn.",
    ],
    points: [
      { label: "Minority answer", value: "200 pts", desc: "Few others shared your experience" },
      { label: "Majority answer", value: "50 pts", desc: "You were with the crowd" },
      { label: "Speed bonus", value: "+50 pts", desc: "Answered quickly" },
    ],
    tip: "If it's really spicy and you're the only one who's done it — that's 200 points of honor.",
  },

  common_ground: {
    title: "Common Ground",
    emoji: "🤝",
    tagline: "More alike than you think.",
    howToPlay: [
      "A relatable experience appears. Tap 'I Have' if you've done it, 'Never' if you haven't.",
      "Unlike Spicy NHIE, this is about finding shared experiences — wholesome fun!",
      "The more you have in common with the room, the higher everyone's score.",
    ],
    points: [
      { label: "Majority answer", value: "200 pts", desc: "Most people shared your experience" },
      { label: "Minority answer", value: "50 pts", desc: "Fewer people have done this" },
      { label: "Speed bonus", value: "+50 pts", desc: "Answered quickly" },
    ],
    tip: "These are designed to be things most people have done — say yes freely.",
  },

  fibbage: {
    title: "Fibbage",
    emoji: "🤥",
    tagline: "The real answer is hidden among fakes.",
    howToPlay: [
      "A question about a surprising real fact appears with four options.",
      "Three of them are convincing fakes — one is actually true. Find the real one!",
      "Speed bonus rewards fast correct answers.",
    ],
    points: [
      { label: "Correct (instant)", value: "1,000 pts", desc: "Spotted the real answer immediately" },
      { label: "Correct (slow)", value: "100 pts", desc: "Eventually found the real answer" },
      { label: "Wrong answer", value: "0 pts", desc: "A fake fooled you" },
    ],
    tip: "The fakes are designed to sound plausible. The real answer is often the most surprising one.",
  },
};
