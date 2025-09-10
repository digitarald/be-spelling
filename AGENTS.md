# Copilot Instructions for Be-Spelling

This is a spelling learning app using spaced repetition (SM-2 algorithm) with AI-generated word lists. The app is **local-only** with IndexedDB storage and integrates with OpenRouter for content generation.

## Architecture Overview

**Tech Stack:**
- Next.js 15.5.2 with App Router and Turbopack
- React 19.1.0, TypeScript 5.x, Tailwind CSS v4
- IndexedDB via Dexie 4.2.x for local storage
- OpenRouter API for AI-generated word lists
- Web Speech API for text-to-speech
- `uuid` for word id generation

**Key Data Models** (from `PRODUCT.md`):
```typescript
type Rating = 'NAILED' | 'ALMOST' | 'STUMPED'
// reps: SM-2 repetition count; interval in days; due ISO string
type SRS = { wordId: string; ease: number; interval: number; due: string; reps?: number }
// sourcePromptHash optional traceability of generation prompt
type Word = { id: string; text: string; hint: string; sourcePromptHash?: string }
type Review = { wordId: string; ts: number; rating: Rating }
```

**Implemented App Structure:**
- `app/page.tsx` - Study queue with TTS, on‑screen letter builder, hint/reveal, rating (✅ Complete)
- `app/settings/page.tsx` - OpenRouter model, prompts, voice selection (✅ Complete)
- `app/manage/page.tsx` - Word lists, import/export (✅ Complete)
- `app/api/generate-words/route.ts` - Server route for OpenRouter integration (✅ Complete)

## Development Workflows

**Building & Running:**
```bash
npm run dev --turbopack    # Development with Turbopack
npm run build --turbopack  # Production build
npm start                  # Production server
```

**Environment Setup:**
- Add `OPENROUTER_API_KEY` to `.env.local` for AI integration
- TypeScript strict mode enabled, use `@/*` path mapping

## Project-Specific Patterns

**Spaced Repetition (SM-2) Implementation:**
- Initial values: `ease=2.5, interval=0`
- Rating mapping: `NAILED→5, ALMOST→3, STUMPED→1`
- Algorithm follows SM-2 with simplified Anki-style adjustments
- Interval progression: first success → 1 day, second → 6 days, subsequent → `round(prevInterval * ease)`; failure resets to 1 day & reps=0
- Ease floor at 1.3; ease updated per SM-2 formula `ease = max(1.3, ease + (0.1 - (5-q) * (0.08 + (5-q)*0.02)))`
- Word considered "learned" when `interval >= 21` days
- Store scheduling data separately from words for flexibility

**Storage Layer (IndexedDB + Dexie):**
- ✅ **Implemented**: Repository pattern in `lib/storage/repositories.ts`
- ✅ **Database**: Schema defined in `lib/storage/database.ts`
- Never access IndexedDB directly from components
- Use repository/service pattern: `lib/storage/` 
- Schema: `words`, `reviews`, `srs` tables (all implemented)
- Implement export/import JSON for backup/restore (✅ Complete)

**Component Architecture:**
- ✅ **Implemented**: All components in `components/ui/`
- **Containers:** Handle state, IndexedDB, business logic
- **Presentational:** Pure UI components, no side effects
- Key components: `SpeakButton`, `HintCard`, `RatingBar`, `DueBadge`, `LetterBuilder` (all implemented)
  - `LetterBuilder` supplies a mobile/touch friendly tap‑to‑assemble letter bank with distractors, replacing raw keyboard typing after the initial listening phase.

**AI Integration (OpenRouter):**
- ✅ **Implemented**: API route at `app/api/generate-words/route.ts`
- Validate and sanitize AI responses before storage (✅ Complete)
- Handle network errors gracefully with fallbacks (✅ Complete)
- Allow model selection in settings (✅ Complete)

## Critical Implementation Details

**Web Speech API (TTS):**
- ✅ **Implemented**: `SpeakButton` component with full TTS integration
- Use `speechSynthesis` and `SpeechSynthesisUtterance`
- Provide voice selection in settings (✅ Complete)
- Handle browser compatibility and permissions (✅ Complete)
- Speech rate and pitch controls implemented

**Font Configuration:**
- ✅ **Implemented**: Uses Geist Sans and Geist Mono with CSS variables
- Current setup: `--font-geist-sans`, `--font-geist-mono`
- Tailwind v4 with `@theme inline` custom properties

**Styling Conventions:**
- ✅ **Implemented**: Tailwind v4 with PostCSS config: `@tailwindcss/postcss`
- Kids-friendly mobile design with large touch targets (min 44px)
- Colorful UI with emoji icons and smooth animations
- CSS custom properties for theming: `--background`, `--foreground`
- Custom animations: `animate-fade-in`, `animate-bounce-in`, `animate-wiggle`

## Common Gotchas

**IndexedDB Operations:**
- ✅ **Handled**: Async/await patterns implemented in repositories
- Always handle async/await properly
- Implement schema versioning for migrations
- Graceful degradation if storage fails

**Spaced Repetition Edge Cases:**
- ✅ **Handled**: Missing review history initialization
- Handle missing review history
- Minimum interval enforcement
- Due date calculations across time zones

**Turbopack Integration:**
- ✅ **Working**: Use `--turbopack` flag consistently
- May have different hot reload behavior than standard webpack
- Current setup typically runs on port 3001 (3000 may be in use)

**AI Content Validation:**
- ✅ **Implemented**: Word list sanitization and validation
- Sanitize word lists from OpenRouter
- Implement content filtering for age-appropriate words
- Handle API rate limits and errors

**Mobile UX Considerations:**
- ✅ **Implemented**: Touch-friendly button sizes (min 44px)
- Prevent text selection and zoom on inputs
- Use `touch-action: manipulation` for buttons
- Large, colorful UI elements for kids
- Smooth animations with reduced motion respect

## File Organization

```
app/
  ├── api/generate-words/route.ts    # OpenRouter integration
  ├── settings/page.tsx              # Configuration UI
  ├── manage/page.tsx                # Word management
  └── page.tsx                       # Main study interface (study flow + LetterBuilder)
lib/
  ├── storage/                       # IndexedDB abstraction
  │   ├── database.ts                # Dexie schema definition
  │   └── repositories.ts            # Repository pattern implementation
  ├── srs/                           # SM-2 algorithm
  │   └── scheduler.ts               # Spaced repetition service
  └── types/                         # TypeScript definitions
      └── index.ts                   # Core type definitions
components/
  └── ui/                            # Reusable UI components
      ├── SpeakButton.tsx            # TTS button with visual feedback
      ├── HintCard.tsx               # Animated hint display
      ├── RatingBar.tsx              # Three-button rating system
      ├── DueBadge.tsx               # Study progress indicator
      └── LetterBuilder.tsx          # Tap-to-assemble letter input with distractors
```

## Additional Implementation Notes

**Local Storage Integration:**
- Settings stored in `localStorage` with fallback defaults
- Study progress and words stored in IndexedDB for reliability
- Export/import uses JSON format for data portability

**Study Flow State Management:**
- Uses React `useState` with phase-based progression
- Phases: `'listening' | 'typing' | 'hint' | 'answer' | 'rating'`
- Initial TTS playback keeps phase `listening`; once audio ends it advances to `typing` enabling `LetterBuilder`.
- `LetterBuilder` completion does not auto-advance (user can reveal hint/answer or rate after reveal).
- Automatic progression after rating loads next due word & stats.

**Error Handling Patterns:**
- Try-catch blocks around all async operations
- User-friendly error messages with recovery suggestions
- Graceful degradation when features unavailable (e.g., no TTS support)

**Performance Considerations:**
- IndexedDB queries optimized with proper indexing
- Lazy loading of word lists in management interface
- Debounced settings saves to prevent excessive writes

## Testing Considerations

- Test SM-2 algorithm with various rating sequences
- Mock IndexedDB for unit tests
- Test TTS availability and fallbacks
- Validate OpenRouter response handling
- E2E test study flow: TTS → input → rating → next word

Remember: This is a **local-first** app prioritizing privacy and offline functionality. All user data stays on device unless explicitly exported.