# Product spec

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

```ts
// SRS
type Rating = 'NAILED'|'ALMOST'|'STUMPED'
type SRS = { wordId: string; ease: number; interval: number; due: string } // days + ISO date

// Word
type Word = { id: string; text: string; hint: string } 

// Review
type Review = { wordId: string; ts: number; rating: Rating }
```

# Key algorithms

* **Scheduling (simplified SM-2)**

  * Start: `ease=2.5, interval=0`
  * Map ratings: `NAILED→q=5`, `ALMOST→q=3`, `STUMPED→q=1`
  * Update:

    * If `q<3`: `interval=1`, `reps=0`
    * Else: `reps+=1`; if `reps==1` → `interval=1`; if `reps==2` → `interval=6`; else `interval=round(interval * ease)`
    * `ease = max(1.3, ease + (0.1 - (5-q)*(0.08 + (5-q)*0.02)))`
    * `due = today + interval days`
      (Lightly adapted from SM-2 / Anki docs.) ([Wikipedia][3], [Anki FAQs][4])

# UI sketch (App Router)

* `app/page.tsx`: study queue (Today/Due, input box, **Hint**, **Show word**, 3-button rating)
* `app/settings/page.tsx`: OpenRouter model, prompt template, voice picker
* `app/manage/page.tsx`: word list, import/export JSON
* Components: `SpeakButton`, `HintCard`, `RatingBar`, `DueBadge`

# API routes

* `POST /api/generate-words`

  * body: `{ promptTemplate: string, seed?: number }`
  * returns: `{ words: {text, hint}[] }`
  * Server-only fetch to OpenRouter using selected model. ([OpenRouter][2])

If you want, I can draft the initial prompt template and a starter Next.js file structure next.

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API?utm_source=chatgpt.com "Web Speech API - MDN - Mozilla"
[2]: https://openrouter.ai/docs/api-reference/overview?utm_source=chatgpt.com "OpenRouter API Reference | Complete API Documentation"
[3]: https://en.wikipedia.org/wiki/SuperMemo?utm_source=chatgpt.com "SuperMemo"
[4]: https://faqs.ankiweb.net/what-spaced-repetition-algorithm?utm_source=chatgpt.com "What spaced repetition algorithm does Anki use?"
[5]: https://dexie.org/?utm_source=chatgpt.com "Dexie.js - Minimalistic IndexedDB Wrapper"
[6]: https://github.com/dexie/Dexie.js?utm_source=chatgpt.com "dexie/Dexie.js: A Minimalistic Wrapper for IndexedDB"
[7]: https://nextjs.org/learn/pages-router/deploying-nextjs-app-deploy?utm_source=chatgpt.com "Pages Router: Deploy to Vercel"
[8]: https://dexie.org/docs/API-Reference?utm_source=chatgpt.com "API Reference"
[9]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API?utm_source=chatgpt.com "Using the Web Speech API - MDN - Mozilla"
[10]: https://mdn.github.io/dom-examples/web-speech-api/speak-easy-synthesis/?utm_source=chatgpt.com "Speech synthesiser"
