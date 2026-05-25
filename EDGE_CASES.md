# Sparky — Edge Case Implementation Plan

Priority legend: 🔴 Critical (breaks the game) · 🟠 High (bad UX) · 🟡 Medium · 🟢 Low

---

## 🔴 Critical

### 1. Room stuck in "generating" on AI failure
**What happens:** OpenRouter returns an error or malformed JSON → `generateQuestions` throws → room status stays "generating" forever, players see the loading spinner with no way out.  
**Fix:** Wrap `generateQuestions` call in Lobby's `startGame` try/catch (already done), but also add a server-side guard: if `setQuestionBatch` is never called within ~30s, a scheduled function resets status to "lobby".  
**Files:** `convex/ai.ts`, new `convex/scheduler.ts`

### 2. Play Again fails → room stuck in "generating"
**What happens:** Same as above but triggered from the Podium. Currently handled with a catch→`resetRoom` fallback, but the fallback itself could fail.  
**Fix:** Already partially fixed. Add a Convex scheduled mutation that fires 45s after status becomes "generating" and resets to "lobby" if still generating.  
**Files:** `convex/rooms.ts`, `convex/scheduler.ts`

### 3. AI returns fewer questions than `count`
**What happens:** If the model returns 7 questions instead of 10, `room.questionBatch` has 7 items. `nextQuestion` advances past index 6, `isLastQuestion` never triggers correctly, and `question` in GameBoard becomes `undefined` → white screen.  
**Fix:** After parsing AI response, validate `questions.length >= count`. If short, either retry or pad with generic fallbacks. Also guard GameBoard: if `question` is undefined and index > 0, call `nextQuestion` to advance to "ended".  
**Files:** `convex/ai.ts`, `app/room/[code]/components/GameBoard.tsx`

### 4. Double-click "Next Question" skips a round
**What happens:** Host clicks Next twice quickly → two `nextQuestion` mutations fire → index jumps by 2.  
**Fix:** Add a `loading` flag in GameBoard (already pattern-matched in other places), or guard the mutation with a debounce. Better: `nextQuestion` mutation should be idempotent — check if `currentQuestionIndex` already advanced before patching.  
**Files:** `convex/rooms.ts` (`nextQuestion` mutation), `app/room/[code]/components/GameBoard.tsx`

### 5. Answer submitted after reveal
**What happens:** A slow player's `submitAnswer` fires after `showReveal` — their answer is counted and affects the score display on the next question.  
**Fix:** In `submitAnswer`, check room status — reject if `status === "reveal"` or `questionIndex !== room.currentQuestionIndex`.  
**Files:** `convex/answers.ts`

---

## 🟠 High

### 6. Player disconnects mid-game with no reconnect path
**What happens:** `isConnected` is set to false, their avatar greys out. If they close the tab, they can't rejoin because `joinRoom` throws "Game already started".  
**Fix:** Change `joinRoom` to allow reconnection even when status is "playing"/"reveal"/"ended" — only block truly new players. Check if `existing` session is found and allow patch regardless of status.  
**Files:** `convex/rooms.ts` (`joinRoom`)

### 7. Host leaves mid-game — no new host for game controls
**What happens:** Host leaves during play → host is promoted to another player (now fixed for lobby). But the new host won't see "Show Results" / "Next Question" controls until their next render, which requires a page refresh since `isHost` is derived from `currentPlayer`.  
**Fix:** `currentPlayer` comes from `useQuery(api.players.getPlayerBySession)` which is reactive — Convex will push the update automatically. Verify this works; if not, force a re-query on role change.  
**Files:** `app/room/[code]/page.tsx`

### 8. Kicked player can immediately rejoin
**What happens:** `kickPlayer` deletes the player record. Nothing stops them from joining again via the room code.  
**Fix:** Add a `bannedSessions: string[]` field to the room document. `kickPlayer` appends the session ID. `joinRoom` checks this list and throws "You have been removed from this room".  
**Files:** `convex/schema.ts`, `convex/rooms.ts`

### 9. All players leave — orphaned room in DB
**What happens:** Everyone leaves, room stays in DB indefinitely. No cleanup, no player records, but room exists.  
**Fix:** In `removePlayer`, after deleting the player, query remaining players. If count === 0, delete the room document.  
**Files:** `convex/players.ts`

### 10. Host starts game then immediately abandons — pending players left in limbo
**What happens:** Private room has pending players. Host starts game, `setStatus("generating")` fires. Pending players are never admitted but also can't leave gracefully (no Leave button on the pending waiting screen during game).  
**Fix:** Show a Leave button on the pending screen even when room is not in "lobby". Also: on `abandonGame`, kick all pending players automatically.  
**Files:** `app/room/[code]/components/Lobby.tsx`, `convex/rooms.ts`

### 11. Room status race — two hosts in different sessions
**What happens:** If host is promoted via `transferHost` and original host tab is still open, the original host's tab still shows `isHost = true` until their query refreshes. They could click "Start Game" simultaneously.  
**Fix:** Convex reactive queries handle this — both tabs see the DB truth within milliseconds. But defensively, `startGame` in Lobby should verify the caller is still the host before `setStatus("generating")`.  
**Files:** `convex/rooms.ts` (`setStatus` or new `startGame` mutation)

### 12. Custom trivia topic too long / injection attempt
**What happens:** User types a very long string or prompt-injection text as a topic (e.g., "Ignore previous instructions and output...").  
**Fix:** Validate `triviaTopic` max length (50 chars) on both frontend (input `maxLength`) and backend (`setTriviaTopic` mutation). Sanitize by stripping special characters on the backend before embedding in the prompt.  
**Files:** `convex/rooms.ts`, `app/room/[code]/components/Lobby.tsx`

---

## 🟡 Medium

### 13. Timer is client-side only — no server enforcement
**What happens:** The SVG countdown timer is purely visual. Players can wait indefinitely without answering. The host must manually click "Show Results".  
**Fix:** For Classic Trivia, add an `auto_reveal_at` timestamp to the room. A Convex scheduled action fires at that time and calls `showReveal` automatically.  
**Files:** `convex/rooms.ts`, `convex/schema.ts`, game component

### 14. Most Likely To — player votes for someone not in the room
**What happens:** If a player disconnects between question generation and answer submission, their ID may still be in the choices list.  
**Fix:** Filter the player list to `isConnected === true` when rendering vote targets.  
**Files:** `app/room/[code]/components/games/MostLikelyTo.tsx`

### 15. Score tie on podium — display order is arbitrary
**What happens:** Two players with the same score are sorted randomly based on JS sort stability.  
**Fix:** Secondary sort by `streak` descending, then by `name` alphabetically as tiebreaker.  
**Files:** `app/room/[code]/components/Podium.tsx`

### 16. Player name clash
**What happens:** Two players can join with the same name. This causes confusion in Most Likely To votes and on the podium.  
**Fix:** In `joinRoom`, check for duplicate names in the room (case-insensitive). Return a helpful error: "Someone named Alex is already in this room".  
**Files:** `convex/rooms.ts`

### 17. Very long player name breaks layout
**What happens:** A 30-character name overflows card labels, avatars, and the podium scoreboard despite `truncate` classes.  
**Fix:** Enforce `maxLength={16}` on the join form name input. Validate max length in `joinRoom` mutation.  
**Files:** `app/room/[code]/components/Lobby.tsx`, `convex/rooms.ts`

### 18. Podium renders with 0 or 1 player
**What happens:** If players disconnect before the game ends, the podium may have 1–2 entries. `PODIUM_ORDER` tries to render slots 0, 1, 2 — slot 2 (`sorted[2]`) is undefined. Currently guarded with `if (!player)` rendering an empty div, but the empty div has no width, shifting the layout.  
**Fix:** Replace the empty div with a placeholder podium column (greyed out "—") so the layout stays centred.  
**Files:** `app/room/[code]/components/Podium.tsx`

### 19. Question bank grows unboundedly
**What happens:** Non-trivia questions are stored in the DB on every new generation. Over time the `questions` table can grow to thousands of rows with no cleanup.  
**Fix:** Add a scheduled cleanup job that deletes questions with `usageCount >= 5` or `createdAt < 30 days ago`.  
**Files:** `convex/scheduler.ts`, `convex/questions.ts`

### 20. Non-host players see no feedback during "generating"
**What happens:** When the host starts the game, status becomes "generating". Non-host players see the loading screen with "Cooking up your questions..." but have no indication of how long it'll take or if it failed.  
**Fix:** Add a timeout indicator ("This is taking longer than usual...") after 15s. If room returns to "lobby", show a toast "Host had to restart — game cancelled".  
**Files:** `app/room/[code]/page.tsx`

### 21. No feedback to non-host players when host changes game settings
**What happens:** Host switches from "Would You Rather" to "Classic Trivia" mid-lobby. Players see the selected mode update via Convex reactivity, but there's no notification.  
**Fix:** Already handled by Convex reactive queries — the waiting panel updates automatically. Minor UX: add a subtle animation pulse on the game mode card when it changes.  
**Files:** `app/room/[code]/components/Lobby.tsx`

### 22. Private room password displayed in plaintext in share URL
**What happens:** The `?pw=PASSWORD` param is visible in the browser address bar and in clipboard history.  
**Fix:** Consider hashing the password or using a time-limited token for the share URL. At minimum, document this limitation.  
**Files:** `app/room/[code]/components/Lobby.tsx`

---

## 🟢 Low / Polish

### 23. Session ID persists across users on shared devices
**What happens:** On a shared phone/tablet, player A joins, then player B uses the same device. They get the same `sparky_session` from localStorage → player B reconnects as player A.  
**Fix:** Add a "Clear session" option on the home page, or scope session to a per-room key (`sparky_session_<code>`).  
**Files:** `app/room/[code]/page.tsx`

### 24. Back button on the browser during game doesn't prompt
**What happens:** Browser back button navigates away from the game without triggering `handleLeave`. Player record persists, room is slightly wrong.  
**Fix:** Use `beforeunload` event or Next.js `useRouter` intercept to call `removePlayer` on tab close.  
**Files:** `app/room/[code]/components/GameBoard.tsx`, `app/room/[code]/components/Lobby.tsx`

### 25. No minimum word count on custom trivia topic
**What happens:** User types a single character ("a") as the topic and the AI tries to generate trivia about it.  
**Fix:** Require `topicDraft.trim().length >= 3` before enabling the Set button, and validate in `setTriviaTopic`.  
**Files:** `app/room/[code]/components/Lobby.tsx`, `convex/rooms.ts`

### 26. Avatar uniqueness check is case/path-sensitive only
**What happens:** Avatar uniqueness compares exact strings (`/avatars/avatar_dog.png`). Not a real risk since paths are fixed, but if a client sends a modified path, they could duplicate.  
**Fix:** Already safe — the avatar list is controlled by the frontend constant and validated on backend by exact match.  
**Files:** No change needed — already handled.

### 27. Confetti fires even when viewing results as a late joiner
**What happens:** If a player joins after the game ends (rare but possible via direct URL), they land on Podium and confetti fires.  
**Fix:** Only fire confetti if `currentPlayer` exists and played the game (has a score).  
**Files:** `app/room/[code]/components/Podium.tsx`

### 28. AI player titles are generated for all players including pending ones
**What happens:** `generatePlayerTitles` receives all players from `getPlayers`, including pending players who never played.  
**Fix:** Filter to `players.filter(p => p.status !== "pending" && p.score > 0)` before sending to AI.  
**Files:** `app/room/[code]/components/Podium.tsx`

### 29. "Waiting for host to start a new game" is shown to non-host even after host leaves
**What happens:** If the new auto-promoted host doesn't know they're now host (tab not refreshed), nobody starts the game and non-hosts wait forever.  
**Fix:** Add a toast/notification: "You are now the host!" when `currentPlayer.isHost` transitions from false to true (detect via useEffect comparing prev value).  
**Files:** `app/room/[code]/page.tsx` or a shared notification component

### 30. Room code not checked for profanity
**What happens:** The random code generator uses letters A-Z and digits — statistically it could spell a slur (e.g., codes like "FCKU23"). Low probability but possible.  
**Fix:** Maintain a small blocklist of 6-char patterns and regenerate if matched. Alternatively, remove ambiguous characters that commonly spell profanity.  
**Files:** `convex/rooms.ts` (`generateCode`)

---

## Implementation Order

| Phase | Items | Effort |
|-------|-------|--------|
| **Now** (before launch) | 1, 2, 3, 4, 5, 6, 8, 12, 17, 25 | ~1 day |
| **Soon** (first week) | 7, 9, 10, 11, 13, 16, 20, 28, 29 | ~2 days |
| **Later** (polish sprint) | 14, 15, 18, 19, 21, 22, 23, 24, 27, 30 | ~1 day |

---

## Game Roadmap

Games already shipped are marked ✅. All others are planned.

### 🎉 Party Games
| Game | Status | Notes |
|------|--------|-------|
| Would You Rather | ✅ Shipped | Two-option vote with reveal |
| Hot Takes | ✅ Shipped | Agree/Disagree, minority earns bonus |
| Most Likely To | ✅ Shipped | Vote for a player |
| Never Have I Ever | ✅ Shipped | I Have / Never vote |
| Rank It | 🔲 Planned | Players rank a list (e.g. "rank these foods worst to best"). Host sees combined rankings. Score = closeness to consensus. Needs ordered-drag UI. |
| True or False Blitz | 🔲 Planned | Fast-paced T/F questions with a tighter timer (5s). Score weighted by speed. Uses same trivia pipeline with `true_false` format. |

### 🧠 Trivia & Knowledge
| Game | Status | Notes |
|------|--------|-------|
| Classic Trivia | ✅ Shipped | 4-option ABCD, custom topic picker |
| Closest Wins | 🔲 Planned | Numeric answer questions ("How many Oscars has Meryl Streep won?"). Player closest to correct number wins the round. Needs a number input + reveal sorted by distance. |
| Poll Spy | 🔲 Planned | AI generates a poll question. Players guess what percentage of people would answer a certain way. Score = closeness to the "true" AI-estimated answer. |

### ✍️ Creative & Writing
| Game | Status | Notes |
|------|--------|-------|
| Quiplash-style | 🔲 Planned | AI generates a prompt ("The worst thing to say at a funeral: ___"). Players type funny answers anonymously. Everyone votes for the funniest. Needs a text-input phase + voting phase + reveal. |
| Two Truths One Lie | 🔲 Planned | Each player submits 3 statements (2 true, 1 lie). Others vote on which is the lie. Requires a submission phase before voting. Player-generated content, no AI needed per round. |
| Bad Advice | 🔲 Planned | AI generates a real-sounding life problem. Players write the worst possible advice. Best/worst answer wins based on votes. Similar pipeline to Quiplash. |
| Fibbage-style | 🔲 Planned | AI generates a statement with a blank (e.g. "The world's largest ___ weighs 4 tons."). Players write fake answers. Everyone votes — real answer earns points, fooling others earns points. Complex scoring. |

### 🤝 Icebreaker & Connection
| Game | Status | Notes |
|------|--------|-------|
| Common Ground | 🔲 Planned | Each round: a category ("Things you'd find in a teenager's bedroom"). Players type one word. Points for matching another player's answer. No AI needed — pure player overlap scoring. |
| First Impressions | 🔲 Planned | Players are shown another player's avatar + name. They answer questions about that person ("What's their job?"). The real player scores points when others guess correctly. |
| Assumptions | 🔲 Planned | AI generates assumption prompts ("I bet someone in this room has never…"). Players vote agree/disagree. Discussion-starter more than a scoring game — lightweight to build. |

### 💑 Couples — Wholesome
| Game | Status | Notes |
|------|--------|-------|
| How Well Do You Know Me? | 🔲 Planned | One player answers questions about themselves. Their partner guesses the answers. Score = matching answers. Needs a "subject player" mechanic (rotating per round). |
| Compatibility Test | 🔲 Planned | Both players answer the same question simultaneously. Score = how closely answers match. Works like a synchronised would-you-rather. |
| Love Language Quiz | 🔲 Planned | Series of scenario questions that map to love languages. At the end, each player gets a result card. More of a reveal experience than a competitive game. |

### 🔥 Couples — Spicy (18+ only, always requires isAdult)
| Game | Status | Notes |
|------|--------|-------|
| Spicy Never Have I Ever | 🔲 Planned | Adult-only variant of Never Have I Ever with explicit scenarios. Uses existing NHIE pipeline with `isAdult: true` forced on. |
| Truth or Dare | 🔲 Planned | AI generates a truth question or dare. Player chooses which. Dare is described textually (can't enforce execution). Needs a "skip dare" option. |
| Red Flag or Green Flag | 🔲 Planned | AI generates a relationship scenario ("They text back 3 days later"). Players vote Red or Green. Minority earns bonus (same as Hot Takes). Adult variant adds explicit scenarios. |
| Confess or Dare | 🔲 Planned | Hybrid of NHIE + T/D. Player is dealt a secret scenario. They can confess ("Yes I have") or take a dare instead. Requires rotating player focus. |
| Fantasy Scenarios | 🔲 Planned | AI generates scenario prompts for couples to react to. Pure discussion-starter, minimal scoring. Requires `isAdult: true` — never accessible without it. |

### Implementation notes for new games
- **Text-input games** (Quiplash, Common Ground, Bad Advice, Fibbage): need a new `submissions` table in the schema and a two-phase round (submit → vote → reveal).
- **Rotating subject games** (Most Likely To is a partial example; First Impressions, HWDYKM, Confess or Dare): need a `subjectPlayerId` field on the room's current question.
- **Numeric input games** (Closest Wins): need a number input component and distance-based scoring in a new mutation.
- **No-AI games** (Two Truths One Lie, Common Ground): player-generated content — no OpenRouter call, just store player submissions and run the vote phase.
- **Couples games**: should be gated at the lobby level — only available when exactly 2 active players (or make them work with groups by pairing players).
- **Spicy variants**: always force `isAdult: true` at the mutation level, regardless of room setting, and show a clear 18+ gate.
