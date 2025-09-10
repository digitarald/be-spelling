# Be-Spelling 📖✨

A kids-friendly spelling learning app using AI-generated word lists and spaced repetition (SM-2 algorithm). Built with Next.js 15, React 19, and local-only storage for privacy.

## Features

- 🔊 **Text-to-Speech**: Browser-based TTS to speak words aloud
- 📝 **Interactive Learning**: Type what you hear, get hints, reveal answers
- ⭐ **Smart Rating**: "Nailed it", "Almost", "Stumped" feedback system
- 🧠 **Spaced Repetition**: SM-2 algorithm for optimal learning intervals
- 🤖 **AI Word Generation**: OpenRouter integration for age-appropriate word lists
- 📱 **Mobile-First**: Kids-friendly touch interface, large buttons
- 🔒 **Privacy-First**: All data stored locally in IndexedDB, no login required
- 💾 **Import/Export**: Backup and restore word lists as JSON

## Quick Start

1. **Clone and install:**
   ```bash
   git clone <repository>
   cd be-spelling
   npm install
   ```

2. **Set up OpenRouter API:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your OpenRouter API key
   ```

3. **Run development server:**
   ```bash
   npm run dev --turbopack
   ```

4. **Open http://localhost:3000**

## App Flow

1. 🔊 App speaks a word (Web Speech API)
2. 📝 Student types the spelling
3. 💡 Tap "Hint" for phonics tips or example sentences  
4. 👁️ Tap "Show word" to reveal correct spelling
5. ⭐ Rate your performance: "Nailed it" / "Almost" / "Stumped"
6. 📚 Next word appears based on spaced repetition schedule

## Pages

- **`/`** - Main study interface with TTS, input, and rating
- **`/settings`** - Configure AI model, prompts, and voice settings
- **`/manage`** - View word lists, generate new words, import/export data

## Tech Stack

- **Framework**: Next.js 15.5.2 with App Router and TurboModepack
- **Frontend**: React 19.1.0, TypeScript 5.x, Tailwind CSS v4
- **Storage**: IndexedDB via Dexie (local-only, no server database)
- **AI**: OpenRouter API for word generation
- **Speech**: Web Speech API for text-to-speech
- **Algorithm**: SM-2 spaced repetition with Anki-style adjustments

## Data Models

```typescript
type Rating = 'NAILED' | 'ALMOST' | 'STUMPED'
type Word = { id: string; text: string; hint: string }
type Review = { wordId: string; ts: number; rating: Rating }
type SRS = { wordId: string; ease: number; interval: number; due: string }
```

## Configuration

### OpenRouter Setup
1. Get an API key from [OpenRouter](https://openrouter.ai/keys)
2. Add to `.env.local`: `OPENROUTER_API_KEY=your_key_here`
3. Default model is Google Gemini 2.5 Flash (fast and efficient)
4. Optional: Override model with `OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet`

### Voice Settings
- Select from available system voices
- Adjust speech rate (0.5x - 1.5x)  
- Adjust pitch (0.5x - 1.5x)
- Test voice with sample phrase

### Word Generation
- Customize prompts for different grade levels
- Examples: "5th-grade Dolch words", "3rd-grade phonics focus", etc.
- AI generates 10 words per request with hints

## Development

```bash
# Development with TurboModepack
npm run dev --turbopack

# Build for production
npm run build --turbopack

# Start production server
npm start
```

## Project Structure

```
app/
├── page.tsx              # Main study interface
├── settings/page.tsx     # Configuration page
├── manage/page.tsx       # Word management
└── api/generate-words/   # OpenRouter API route

lib/
├── types/               # TypeScript definitions
├── storage/             # IndexedDB repositories (Dexie)
└── srs/                # SM-2 algorithm implementation

components/
└── ui/                 # Reusable UI components
```

## Privacy & Data

- **Local-only storage**: All progress saved in browser's IndexedDB
- **No user accounts**: No sign-up or login required
- **No tracking**: No analytics or data collection
- **Export/import**: Full control over your data
- **Offline capable**: Works without internet (after initial load)

## Contributing

1. Follow the existing TypeScript patterns
2. Use the repository pattern for data access
3. Keep components mobile-friendly with large touch targets
4. Test on actual mobile devices for kid usability
5. Maintain local-first philosophy

## License

Open source - see LICENSE file for details.

---

Built with ❤️ for young learners. Happy spelling! 🌟
