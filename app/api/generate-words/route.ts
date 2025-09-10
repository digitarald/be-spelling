import { NextRequest, NextResponse } from 'next/server';
import { GenerateWordsRequest, GenerateWordsResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateWordsRequest = await request.json();
    const { promptTemplate, seed } = body;

    if (!promptTemplate) {
      return NextResponse.json({ error: 'promptTemplate is required' }, { status: 400 });
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    // Construct the full prompt
    const systemPrompt = `You are a helpful assistant that generates age-appropriate spelling words for children.
Generate EXACTLY 10 UNIQUE words based on the user's criteria.

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

    // Validate each word
    const validWords = wordsData.words.filter((word: any) => 
      word && 
      typeof word.text === 'string' && 
      typeof word.hint === 'string' &&
      word.text.trim().length > 0 &&
      word.hint.trim().length > 0
    );

    if (validWords.length === 0) {
      return NextResponse.json({ error: 'No valid words generated' }, { status: 500 });
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

    const response_data: GenerateWordsResponse = {
      words: validWords.map((word: any) => {
        const text = word.text.trim().toLowerCase();
        const rawHint = word.hint.trim();
        const hint = sanitizeHint(text, rawHint);
        return { text, hint };
      })
    };

    return NextResponse.json(response_data);

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}