# Be‑Spelling 📖✨

Local‑first spelling practice for kids: hear the word, build the spelling, get gentle feedback, and retain it through spaced repetition. All progress stays in the browser.

## Why
Fast to start, safe for kids (no accounts / tracking), and powered by a lightweight SM‑2 variant + optional AI word generation.

## Core Features
- 🔊 Speech (Web Speech API)
- 🧠 Spaced repetition (simplified SM‑2)
- 📝 Hint + immediate answer reveal
- ⭐ Auto rating (exact / near miss detection)
- 🤖 (Optional) AI word + hint generation
- 💾 Import / Export JSON backup
- 🔒 100% local data (IndexedDB + localStorage)

## Quick Start
```bash
git clone <repository>
cd be-spelling
npm install
cp .env.local.example .env.local   # add OPENROUTER_API_KEY if you want AI generation
npm run dev
# open http://localhost:3000
```

Want production?
```bash
npm run build && npm start
```

## Scripts
```bash
npm run dev     # develop (Turbopack)
npm run build   # production build
npm start       # run built app
npm run lint    # lint sources
```

## Key Pages
- `/` Study flow (speech → build → hint → check → rate → next)
- `/manage` Generate, list, delete, import/export words
- `/settings` Prompt template + voice / speech controls

## Docs & Internals
- Product narrative & scope: `PRODUCT.md`
- Architecture & data contracts: `AGENTS.md`
- Scheduler logic: `lib/srs/scheduler.ts`
- Storage layer: `lib/storage/*`

## Tech Stack (brief)
Next.js 15 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Dexie (IndexedDB) · Web Speech API · OpenRouter (server route only) · uuid

## Privacy
No accounts, no analytics, no network calls except on‑demand AI generation (if configured). Your learner’s progress never leaves the device.

## Contributing
Small PRs welcome. Keep:
1. Types & invariants in sync with `AGENTS.md`
2. No direct Dexie access in UI (use repositories)
3. Mobile / touch ergonomics ≥44px targets
4. Local‑first principle (no surprise network writes)

## License
See `LICENSE`.

–– Happy spelling! 🌟
