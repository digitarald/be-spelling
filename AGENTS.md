# Copilot Instructions for Be-Spelling

Local-first spelling learning app with spaced repetition (simplified SM‑2) and AI-generated word + hint lists. All learner data stays on-device (IndexedDB + localStorage). OpenRouter only used for generation when invoked.

IMPORTANT: Keep this updated with any architecture changes.

See [PRODUCT.md](PRODUCT.md) for narrative.

## Architecture Overview

**Tech Stack**
* Next.js 15.5.2 (App Router) + Turbopack
* React 19.1.x, TypeScript 5.x (strict)
* Tailwind CSS v4 (utility-first, custom CSS vars + animations)
* Dexie 4.2.x for IndexedDB persistence
* OpenRouter API (default model: Google Gemini 2.5 Flash; env override `OPENROUTER_DEFAULT_MODEL`)
* Web Speech API (speechSynthesis) for text‑to‑speech
* `uuid` for deterministic word ids (creation)

**Key Data Models**
```ts
type Rating = 'NAILED' | 'ALMOST' | 'STUMPED'
type SRS = { wordId: string; ease: number; interval: number; due: string; reps?: number }
type Word = { id: string; text: string; hint: string; sourcePromptHash?: string }
type Review = { wordId: string; ts: number; rating: Rating }
```

**Implemented App Structure**
* `app/page.tsx` – Study flow: TTS → LetterBuilder → Hint (optional) → Check (auto‑rating) → feedback → next due word
* `app/manage/page.tsx` – Generate words, list with due & review stats, delete, clear, import/export, SRS auto‑init
* `app/settings/page.tsx` – Prompt template, voice selection, speech rate/pitch, test voice
* `app/api/generate-words/route.ts` – OpenRouter integration (duplicate filtering, sanitization)
* `components/ui/*` – Reusable UI set (see below)
* `lib/srs/scheduler.ts` – Spaced repetition logic (SM‑2 variant + early randomization)
* `lib/storage/*` – Dexie schema + repository abstractions

**UI Components**
`SpeakButton`, `LetterBuilder`, `HintCard`, `RatingBar`, `DueBadge`, `AppFooter` (+ utility animations & color tokens).

## Current Study Interaction Model

1. Initial phase `listening` while the first TTS playback occurs.
2. Phase transitions to `typing` enabling the **LetterBuilder** (touch‑friendly letter bank with distractors; no free text field).
3. Learner may tap **Hint** (phase `hint`) – reveals one stored hint.
4. **Check** button always reveals the answer and evaluates attempt.
5. Auto‑rating:
   * Exact match → `NAILED` (+ celebration confetti & feedback)
   * Slight typo (edit distance 1 OR adjacent letter transposition) → `ALMOST`
   * Otherwise manual rating buttons appear (`RatingBar`).
6. Feedback card appears briefly, then automatically loads next due word + updates stats.

## Scheduler (Simplified SM‑2 + Enhancements)

* Mapping: NAILED=5, ALMOST=3, STUMPED=1.
* Fail (<3): interval=1, reps=0.
* Success path: reps++ → (1→1d, 2→6d, else `round(prevInterval * ease)`).
* Ease adaptation: `ease = max(1.3, ease + (0.1 - (5-q)*(0.08 + (5-q)*0.02)))`.
* Learned threshold: `interval >= 21` days.
* Early new‑item mild randomization: choose randomly among earliest slice (≤5) of brand new (`interval=0 & reps=0`) or very early (`reps < 2`) items to avoid fixed ordering while respecting due times.
* Stats returned: total, due (<= now), learned.

## Storage Layer

* Dexie version 1 schema:
  * `words: id, text, hint, sourcePromptHash`
  * `reviews: ++id, wordId, ts, rating`
  * `srs: wordId, ease, interval, due, reps`
# Technical Developer Guidance

Implementation handbook for Be‑Spelling. Product goals & user narrative reside in `PRODUCT.md`; this file focuses on architecture, patterns, invariants, and extension safety.

## 1. Technology Stack
Next.js 15 (App Router + Turbopack) · React 19 · TypeScript strict · Tailwind CSS v4 · Dexie (IndexedDB) · Web Speech API · OpenRouter (LLM) · `uuid`.

## 2. Directory Map
```
app/                      Route handlers & pages
  api/generate-words/     OpenRouter integration (POST)
  manage/                 Word management UI
  settings/               Prompt & TTS configuration
  page.tsx                Study experience
components/ui/            Reusable presentational widgets
lib/types/                Core TS types
lib/storage/              Dexie schema + repositories
lib/srs/                  Scheduler service
```

## 3. Core Data Contracts
```ts
type Rating = 'NAILED' | 'ALMOST' | 'STUMPED'
type Word = { id: string; text: string; hint: string; sourcePromptHash?: string }
type Review = { wordId: string; ts: number; rating: Rating }
type SRS = { wordId: string; ease: number; interval: number; due: string; reps?: number }
```
Rules:
* `ease` floor = 1.3.
* Learned condition: `interval >= 21` days.
* `due` stored as ISO string (UTC normalization implicit via `toISOString`).

## 4. Scheduling Invariants (Simplified SM‑2)
Quality mapping: NAILED=5, ALMOST=3, STUMPED=1.
Algorithm:
* Fail (q<3): interval=1, reps=0.
* Success: reps++; intervals: 1st→1d, 2nd→6d, else `round(prevInterval * ease)`.
* Ease update: `ease = max(1.3, ease + (0.1 - (5-q)*(0.08 + (5-q)*0.02)))`.
* Early selection randomization: among earliest (≤5) due items that are brand‑new (`interval=0 & reps=0`) or `reps<2`, pick random; else earliest due.
Do not alter these without updating docs + migration logic.

## 5. Storage Layer Patterns
Dexie v1 schema tables:
* `words (id, text, hint, sourcePromptHash)`
* `reviews (++id, wordId, ts, rating)`
* `srs (wordId, ease, interval, due, reps)`
Repositories guarantee:
* Transactional delete (word + related reviews + srs).
* Bulk add + SRS initialization for new words.
* Export/import full snapshot (import = destructive restore).
Never query Dexie directly in UI components—extend repositories instead.

## 6. Generation Route Contract (`POST /api/generate-words`)
Request: `{ promptTemplate: string; existingWords: string[] }`.
Environment:
* `OPENROUTER_API_KEY` required.
* `OPENROUTER_DEFAULT_MODEL` optional (default Gemini 2.5 Flash).
Sanitization responsibilities:
* Shape validation (array of { text, hint }).
* De‑dup removal (case‑insensitive) vs existingWords.
* Basic content safety (length, no proper nouns if prompt asks, kid‑appropriate).

## 7. Auto‑Rating Logic
Normalization: lowercase trim.
Auto outcomes:
* Exact → NAILED.
* Single edit (insert/delete/substitute) OR adjacent transposition → ALMOST.
* Else manual rating UI.
Always reveal correct spelling after check (reinforcement). Empty attempt never auto‑rates.

## 8. Settings Persistence
LocalStorage key: `be-spelling-settings` containing:
```ts
{ promptTemplate: string; selectedVoice: string; speechRate: number; speechPitch: number }
```
Defaults: speechRate 0.8, pitch 1.0. Voice defaults to first local English voice if unset.

## 9. Accessibility & UX Engineering Notes
* All actionable elements ≥44px.
* Use CSS vars for theming; keep contrast high.
* Respect `prefers-reduced-motion` (limit confetti/animations if set).
* LetterBuilder provides deterministic letter set + distractors; keep logic pure for testability.

## 10. Error Handling & Resilience
Patterns:
* Wrap async DB + network calls in try/catch; surface friendly message.
* On generation error: do not mutate existing words; show alert.
* SRS initialization guard runs whenever listing words (idempotent).
* Import restore is transactional: clear tables then bulkAdd; abort on parse/shape failure.

## 11. Performance Considerations
* Batch operations (`bulkAdd`, Promise.all) for generation.
* Avoid recalculating Levenshtein distance beyond early exit >1.
* Keep due selection in memory (list is local scale; no pagination needed yet).

## 12. Extension Guidelines
When adding features:
1. Update types in `lib/types` first.
2. Add Dexie schema version bump (`this.version(n+1)`) + migration mapping old data.
3. Keep repository abstraction—never expose raw Dexie tables.
4. Maintain scheduler invariants or document deliberate changes.
5. Sanitize any new AI‑generated fields (length, profanity, PII).
6. Add minimal tests for new algorithmic branches (scheduler, auto‑rating edge cases).

## 13. Adding a New Rating (Example Process)
* Update `Rating` union.
* Map to quality `q` inside scheduler (`ratingToQuality`).
* Adjust auto‑rating decision tree if applicable.
* Revise ease formula impact (if new q differs from 1/3/5 anchors) + docs.
* Add button in `RatingBar` with accessible label.

## 14. Testing Strategy (Guidelines)
Unit:
* Scheduler update sequences (fail→success chains, ease floor, learned boundary ≥21d).
* Auto‑rating detection (exact, substitution, insertion, deletion, transposition, >1 edit rejection).
Integration:
* Import/export round-trip (id & SRS integrity).
* Generation route sanitization (duplicate filtering).
Exploratory:
* Voice selection fallback when no local English voice.
* Offline mode study (generation disabled but review intact).

## 15. Common Pitfalls
* Forgetting to initialize SRS for newly added words → always call `initializeSRS` after bulk add.
* Mutating state before awaiting async review + schedule writes → ensure sequential `await` to avoid race updating stats.
* Over‑randomizing early selection (keep cap ≤5 to prevent schedule drift).

## 16. Security / Privacy Boundaries
* No remote persistence—do not introduce analytics or third‑party scripts without explicit product decision.
* API key must remain server‑side (Route Handler); never expose directly in client bundle.

## 17. Future Technical Hooks (Reserved)
* Optional tagging: prospective `wordTags` table (wordId, tag).
* Profiles: namespacing by `profileId` prefix in all primary keys or separate DB instance name.
* PWA: add manifest + service worker caching static assets; keep IndexedDB reuse.

## 18. Quick Reference Table
| Concern | Location |
|---------|----------|
| Scheduler logic | `lib/srs/scheduler.ts` |
| Repositories | `lib/storage/repositories.ts` |
| DB schema | `lib/storage/database.ts` |
| Study UI | `app/page.tsx` |
| Generation API | `app/api/generate-words/route.ts` |
| Settings UI | `app/settings/page.tsx` |
| Manage UI | `app/manage/page.tsx` |
| Types | `lib/types/index.ts` |
| UI components | `components/ui/*` |

## 19. Build & Run
```bash
npm run dev --turbopack
npm run build --turbopack
npm start
```

## 20. Change Control Checklist (Pre-PR)
[] Types updated
[] Schema/migration (if needed)
[] Repositories extended (no raw DB leakage)
[] Tests added/updated
[] Docs: `PRODUCT.md` (if product impact) / this file (if technical impact)
[] Manual smoke: generate → study → rate → export/import

Refer to `PRODUCT.md` before altering learner-facing behaviors. Keep this document implementation-focused and lean.