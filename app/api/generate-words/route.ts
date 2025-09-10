import { NextRequest, NextResponse } from 'next/server';
import { GenerateWordsRequest, GenerateWordsResponse } from '@/lib/types';

// Simple in-memory rate limiter (process-level; resets on server restart)
// Rationale: Local-first app; prevents accidental rapid-fire generation spam.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;   // max requests per window
let recentRequests: number[] = [];

// Hard ceiling for total stored words (local IndexedDB on client). API relies on client telling us the total.
const MAX_TOTAL_WORDS = 100;

export async function POST(request: NextRequest) {
  try {
    // --- Rate limiting ----------------------------------------------------
    const now = Date.now();
    recentRequests = recentRequests.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
      const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - recentRequests[0]);
      return NextResponse.json({
        error: 'Rate limit exceeded. Please wait before generating more words.',
        code: 'RATE_LIMIT',
        limit: RATE_LIMIT_MAX_REQUESTS,
        windowSeconds: RATE_LIMIT_WINDOW_MS / 1000,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000)
      }, { status: 429 });
    }
    recentRequests.push(now);

    const body: GenerateWordsRequest = await request.json();
    const { promptTemplate, seed, existingWords = [], existingWordCount } = body;

    if (!promptTemplate) {
      return NextResponse.json({ error: 'promptTemplate is required' }, { status: 400 });
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    // Construct the full prompt
    // Normalize and constrain existing words list for prompt (avoid gigantic prompts)
    const normalizedExisting = Array.from(
      new Set(
        (existingWords || [])
          .filter(w => typeof w === 'string')
          .map(w => w.trim().toLowerCase())
          .filter(w => w.length > 0 && w.length <= 30)
      )
    );
    const MAX_EXISTING_IN_PROMPT = 120; // heuristic cap
    const existingSample = normalizedExisting.slice(-MAX_EXISTING_IN_PROMPT);

    const exclusionListForPrompt = existingSample.join(', ');
    // Determine total existing (may be higher than the sample length provided for exclusion)
    const existingTotal = typeof existingWordCount === 'number' && existingWordCount >= 0
      ? existingWordCount
      : normalizedExisting.length;

    if (existingTotal >= MAX_TOTAL_WORDS) {
      return NextResponse.json({
        error: 'Word limit reached (100). Delete some words before generating more.',
        code: 'WORD_LIMIT',
        limit: MAX_TOTAL_WORDS
      }, { status: 429 });
    }

    const remainingSlots = MAX_TOTAL_WORDS - existingTotal;
    const targetGenerateCount = Math.min(10, remainingSlots);

    const systemPrompt = `You are a helpful assistant that generates age-appropriate spelling words for children.
Generate EXACTLY ${targetGenerateCount} UNIQUE words based on the user's criteria.

Do NOT use any word from this exclusion list (case-insensitive): ${exclusionListForPrompt || '(no exclusions)'}

For EACH word produce a JSON object with:
  - "text": the lowercase spelling word (letters only, no surrounding quotes inside the value)
  - "hint": a SHORT helpful clue for HOW to spell it (WITHOUT the word itself and NOT a hint for what the word means)

CRITICAL RULES FOR HINTS (must follow ALL):
  1. DO NOT include the exact spelling word (its full sequence of letters) anywhere in its own hint.
  2. Do not partially spell it with hyphens/spaces (e.g. c-a-t, or c a t) or disguised forms.
  3. Avoid saying "the word is" / "spells" / "means <word>".
  4. Keep hints kid‑friendly and positive.
  5. Max ~120 characters per hint.

Return ONLY valid JSON with this shape:
{
  "words": [
    {"text": "butterfly", "hint": "…"},
    {"text": "elephant", "hint": "…"}
  ]
}`;

    const userPrompt = `Generate spelling words based on this criteria: ${promptTemplate}`;

    // Get model from environment or use default
    const model = process.env.OPENROUTER_DEFAULT_MODEL || 'google/gemini-2.5-flash';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Be-Spelling App'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: seed ? 0.3 : 0.7, // Lower temperature for reproducible results with seed
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return NextResponse.json({ error: 'Failed to generate words' }, { status: 500 });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No content received from AI' }, { status: 500 });
    }

    // Parse the JSON response from the AI
    let wordsData;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      wordsData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 });
    }

    // Validate the response structure
    if (!wordsData.words || !Array.isArray(wordsData.words)) {
      return NextResponse.json({ error: 'Invalid word list format' }, { status: 500 });
    }

    // Validate each word & perform de-duplication against generated set + existing
    const existingSet = new Set(normalizedExisting);
    const seenGenerated = new Set<string>();
    const validWords = wordsData.words
      .filter((word: any) => 
        word && 
        typeof word.text === 'string' && 
        typeof word.hint === 'string' &&
        word.text.trim().length > 0 &&
        word.hint.trim().length > 0
      )
      .map((word: any) => ({
        text: word.text.trim().toLowerCase(),
        hint: word.hint.trim()
      }))
      .filter(({ text }: { text: string }) => {
        if (existingSet.has(text)) return false; // exclude existing
        if (seenGenerated.has(text)) return false; // exclude duplicates in this batch
        seenGenerated.add(text);
        return true;
      });

    if (validWords.length === 0) {
      return NextResponse.json({ error: 'No valid novel words generated (all duplicates?)' }, { status: 500 });
    }

    // Sanitization: ensure hints do not leak their word
    function sanitizeHint(wordText: string, hint: string): string {
      const cleanedWord = wordText.trim().toLowerCase();
      if (!cleanedWord) return hint;
      const escaped = cleanedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordRegex = new RegExp(`\\b${escaped}\\b`, 'gi');
      let safeHint = hint.replace(wordRegex, '');
      // Remove accidental spaced-out spellings (e.g., c a t)
      const spacedLetters = cleanedWord.split('').join(' ');
      const spacedRegex = new RegExp(spacedLetters.replace(/ /g, '\\s+'), 'ig');
      safeHint = safeHint.replace(spacedRegex, '');
      // Collapse extra spaces
      safeHint = safeHint.replace(/\s{2,}/g, ' ').trim();
      if (!safeHint) {
        safeHint = 'A clue is hidden to avoid revealing the word — think of its meaning!';
      }
      return safeHint;
    }

    // Enforce ceiling defensively (should already have asked model for the reduced count)
    const limited = validWords.slice(0, remainingSlots);

    const response_data: GenerateWordsResponse = {
      words: limited.map((word: any) => {
        const text = word.text; // already normalized lower-case
        const hint = sanitizeHint(text, word.hint);
        return { text, hint };
      })
    };

    return NextResponse.json(response_data);

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}