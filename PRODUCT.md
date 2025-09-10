# Product spec

IMPORTANT: Keep this updated with any feature/scope changes.

* **Flow**

  1. App speaks a word (browser TTS). ([MDN Web Docs][1])
  2. Student types the spelling.
  3. Tap **Hint** to reveal a phonics tip or example sentence (one per word).
  4. Tap **Show word** to uncover the correct spelling.
  5. Rate result with a friendly scale: **Nailed it / Almost / Stumped** (drives spaced-repetition).
  6. Next word appears (due order uses SRS due dates).
* **Word source**

  * Server route calls **OpenRouter** to generate grade-appropriate word lists; parent can edit the prompt template (e.g., “5th-grade Dolch/Fry–style words, mix of multisyllabic, no proper nouns”). ([OpenRouter][2])
* **Spaced repetition**

  * Use a simplified **SM-2** style scheduler (store ease, interval, due date per word; map ratings: *Nailed it*=5, *Almost*=3, *Stumped*=1). ([Wikipedia][3], [Anki FAQs][4])
* **Data & privacy**

  * **Local-only**: Progress and schedule in **IndexedDB**; no login. Use a tiny wrapper like **Dexie** for reliability and ergonomic queries. ([Dexie][5], [GitHub][6])

# Tech spec (Next.js + Vercel + OpenRouter)

* **Framework & deploy**

  * **Next.js** (App Router) deployed on **Vercel**. Use Route Handlers (`app/api/.../route.ts`) for server-side calls. ([Next.js][7])
* **TTS**

  * Browser **Web Speech API** (`speechSynthesis`, `SpeechSynthesisUtterance`); pick a default voice and allow switching when available. ([MDN Web Docs][1])
* **LLM integration (OpenRouter)**

  * Server route posts to OpenRouter (OpenAI-style schema). Keep API key in `OPENROUTER_API_KEY` env; allow model selection. ([OpenRouter][2])
* **Storage**

  * **Dexie** schema: `words` (id, text, hint, sourcePromptHash), `reviews` (wordId, ts, rating), `srs` (wordId, ease, intervalDays, dueISO). Export/import JSON for backup. ([Dexie][8])

# Minimal data models
# Product Specification

Concise statement of what Be‑Spelling delivers for learners, parents, and scope decisions. Technical implementation details live in `AGENTS.md`.

## Core Value Proposition
Help elementary learners internalize correct spelling through low‑friction, bite‑sized review powered by adaptive spaced repetition and audible word exposure—fully local for privacy.

## Primary User Roles
* Learner (child) – practices words in short sessions.
* Parent / Educator – seeds or adjusts word list via AI generation and prompt tweaks.

## Learning Flow (Target Experience)
1. Hear the word (text‑to‑speech).
2. Assemble letters (guided on‑screen Letter Builder; no keyboard dependency).
3. (Optional) View a single hint (phonics cue / context sentence).
4. Check answer (always reveals correct spelling for reinforcement).
5. Auto or manual rating feeds scheduler (Nailed it / Almost / Stumped).
6. Next due word appears; brief positive feedback maintains momentum.

## Content Source
* AI generation endpoint produces (word, hint) pairs from an adjustable natural language prompt (grade level, constraints, exclusions).
* Duplicate avoidance: existing words passed to generation step.

## Spaced Repetition Model
* Simplified SM‑2 variant using ease, interval (days), due date, repetition count.
* Ratings map: Nailed it=5, Almost=3, Stumped=1.
* Interval sequence: first success 1d → second 6d → thereafter `round(prev * ease)`; failure resets to 1d & reps=0.
* Ease update per SM‑2 formula; floor at 1.3. Learned threshold: interval ≥ 21 days.
* Mild randomization among earliest new/early items prevents monotony while honoring due order.

## Auto‑Rating Policy
* Exact match → Nailed it.
* Single edit (insert / delete / substitute) or adjacent transposition → Almost.
* Otherwise learner chooses rating after reveal.

## Data & Privacy Principles
* 100% on‑device (IndexedDB + localStorage); no accounts, no analytics, no remote sync.
* Export / Import JSON snapshot for manual backup or transfers (destructive restore with confirmation).

## Accessibility & UX Goals
* Touch targets ≥44px; high contrast themes; reduced‑motion respect.
* Audio + visual reinforcement each attempt; immediate answer reveal to reduce frustration loops.
* Frictionless “correct / near‑correct” handling via auto‑rating (minimize cognitive overhead).

## Success Metrics (Qualitative First Release)
* Learner can complete a 10‑word review session without external assistance.
* Parent can generate a fresh set of words (<30s) and see them appear in study flow.
* Re‑opening app days later surfaces only due words, not entire list.

## Out‑of‑Scope (Initial Release)
* Multi‑profile learner accounts.
* Sync across devices or cloud backup.
* Word tagging / difficulty clustering.
* Gamification layers (streaks, XP) beyond simple celebratory feedback.

## Minimal Data Model (Product View)
```ts
type Rating = 'NAILED' | 'ALMOST' | 'STUMPED'
type Word   = { id: string; text: string; hint: string }
```
Scheduler & review persistence fields (ease, interval, due, reps, reviews) exist but are implementation details (see `AGENTS.md`).

## Core Screens
* Study: listen, build, hint, check, feedback, stats (Due / Learned / Total).
* Manage: generate, list, delete, import/export, clear all.
* Settings: prompt template, voice & speech settings.

## Risks & Mitigations
* AI generates unsuitable words → sanitize + constraints + duplicate filtering.
* Over‑correction fatigue → always reveal answer; auto‑rating for minor errors.
* Engagement drop from fixed order → early‑stage randomization slice.

## Future Opportunities
* Session summary (accuracy, new learned count).
* Difficulty tiers / custom lists per subject.
* PWA install & offline manifest polish.
* Multi‑learner profiles (namespaced data sets).

---
Implementation references: SM‑2 (Wikipedia, Anki FAQ), Web Speech API, OpenRouter. See `AGENTS.md` for technical specifics.

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API?utm_source=chatgpt.com
[2]: https://openrouter.ai/docs/api-reference/overview?utm_source=chatgpt.com
[3]: https://en.wikipedia.org/wiki/SuperMemo?utm_source=chatgpt.com
[4]: https://faqs.ankiweb.net/what-spaced-repetition-algorithm?utm_source=chatgpt.com
[5]: https://dexie.org/?utm_source=chatgpt.com
[6]: https://github.com/dexie/Dexie.js?utm_source=chatgpt.com
Reusable UI components: `SpeakButton`, `LetterBuilder`, `HintCard`, `RatingBar`, `DueBadge`, `AppFooter`.
