'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Word, Rating, StudyPhase } from '@/lib/types';
import { wordRepository, reviewRepository } from '@/lib/storage/repositories';
import { spacedRepetitionService } from '@/lib/srs/scheduler';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { LetterBuilder } from '@/components/ui/LetterBuilder';
import { HintCard } from '@/components/ui/HintCard';
import { RatingBar } from '@/components/ui/RatingBar';
import { DueBadge } from '@/components/ui/DueBadge';
import { AppFooter } from '@/components/ui/AppFooter';

export default function StudyPage() {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState<StudyPhase>('listening');
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [autoRated, setAutoRated] = useState(false);
  const [studyStats, setStudyStats] = useState({ total: 0, due: 0, learned: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string>('');
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Load next word and stats
  const loadNextWord = async () => {
    try {
      const nextWordId = await spacedRepetitionService.getNextWord();
      
      if (!nextWordId) {
        setCurrentWord(null);
        return;
      }

      const word = await wordRepository.getWord(nextWordId);
      if (word) {
        setCurrentWord(word);
        resetStudyState();
      }
    } catch (error) {
      console.error('Error loading next word:', error);
    }
  };

  const loadStats = async () => {
    try {
      const stats = await spacedRepetitionService.getStudyStats();
      setStudyStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const resetStudyState = () => {
    setUserInput('');
    setPhase('listening');
    setShowHint(false);
    setShowAnswer(false);
    setFeedback('');
    setWasCorrect(null);
    setCelebrate(false);
    setAutoRated(false);
  };

  const handleSpeakStart = () => {
    // Only keep phase as 'listening' for the very first pronunciation.
    // If the learner is already past the initial listening phase (e.g. typing/hint/answer),
    // we don't revert the UI back to 'listening' because that hides the LetterBuilder.
    if (phase === 'listening') return; // initial play: leave as-is so onSpeakEnd can advance to typing
    // Subsequent replays while typing / hint / answer: do nothing (just replay audio)
  };

  const handleSpeakEnd = () => {
    if (phase === 'listening') {
      setPhase('typing');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const handleShowHint = () => {
    setShowHint(true);
    setPhase('hint');
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    setPhase('answer');
  };

  // New unified check handler (replaces separate Show Word + conditional Check)
  const handleCheck = () => {
    if (!currentWord) return;
    const attempt = userInput.trim().toLowerCase();
    const target = currentWord.text.trim().toLowerCase();

    const correct = attempt === target;
    const slightlyWrong = !correct && isSlightlyWrong(attempt, target);

    // Always reveal the answer for reinforcement
    setShowAnswer(true);
    setWasCorrect(correct);

    if (correct || slightlyWrong) {
      // Skip manual rating UI and auto‑rate
      if (correct) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 2000);
        setAutoRated(true);
        handleRating('NAILED');
      } else if (slightlyWrong) {
        setAutoRated(true);
        handleRating('ALMOST');
      }
    } else {
      // Proceed to answer phase; buttons for manual rating will show
      setPhase('answer');
    }
  };

  // Determine if an attempt is "slightly wrong" (small typo) -> auto map to ALMOST.
  // Criteria: edit distance 1 (insertion, deletion, substitution) or single adjacent transposition.
  const isSlightlyWrong = (a: string, b: string): boolean => {
    if (!a || !b) return false; // empty attempts shouldn't auto-rate
    const lenDiff = Math.abs(a.length - b.length);
    if (lenDiff > 1) return false;

    if (a.length === b.length && a !== b) {
      // Adjacent transposition check (e.g., 'cta' vs 'cat')
      for (let i = 0; i < a.length - 1; i++) {
        if (a[i] !== b[i]) {
          if (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2)) {
            return true;
          }
          break;
        }
      }
    }

    // Levenshtein distance early-exit if >1
    let edits = 0;
    let i = 0, j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        i++; j++;
        continue;
      }
      edits++;
      if (edits > 1) return false;
      if (a.length === b.length) { // substitution
        i++; j++;
      } else if (a.length > b.length) { // deletion from a
        i++;
      } else { // insertion into a
        j++;
      }
    }
    // Account for trailing char
    if (i < a.length || j < b.length) edits++;
    return edits === 1;
  };

  const handleRating = async (rating: Rating) => {
    if (!currentWord) return;

    try {
      // Record the review
      await reviewRepository.addReview(currentWord.id, rating);
      
      // Update SRS
      await spacedRepetitionService.updateSRS(currentWord.id, rating);

      // Show feedback
      const isCorrect = userInput.toLowerCase().trim() === currentWord.text.toLowerCase();
      if (rating === 'NAILED') {
        setFeedback(isCorrect ? '🌟 Perfect spelling! Great job!' : '🌟 You know this word well!');
      } else if (rating === 'ALMOST') {
        setFeedback('👍 Almost there! Keep practicing!');
      } else {
        setFeedback('🤔 No worries! You\'ll get it next time!');
      }

      setPhase('rating');

      // Load next word after a delay
      setTimeout(() => {
        loadNextWord();
        loadStats();
      }, 2000);

    } catch (error) {
      console.error('Error handling rating:', error);
    }
  };

  // Initialize on component mount
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        const allWords = await wordRepository.getAllWords();
        if (allWords.length === 0) {
          // First-ever visit: no words generated yet
          setIsOnboarding(true);
        } else {
          setIsOnboarding(false);
          await loadNextWord();
          await loadStats();
        }
      } catch (e) {
        console.error('Initialization error', e);
      }
      setIsLoading(false);
    };
    
    initialize();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">📚</div>
          <p className="text-xl font-semibold text-[var(--muted)]">Loading your words...</p>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    if (isOnboarding) {
      return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-6">
          <div className="text-center max-w-md space-y-6 animate-fade-in">
            <div className="text-8xl mb-2">✨</div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Welcome to Be-Spelling!</h1>
            <p className="text-lg text-[var(--foreground)] leading-relaxed">
              Let&apos;s generate your first batch of spelling words using the AI word generator.
              You&apos;ll then listen, build the word from letters, and rate how well you knew it.
            </p>
            <div className="bg-[var(--surface)]/80 dark:bg-[var(--surface)]/70 backdrop-blur rounded-2xl p-5 shadow-md text-left text-[var(--foreground)] space-y-2 border border-[color:var(--border)]">
              <p className="font-semibold text-[var(--foreground)]">Getting started:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Tap <span className="font-semibold">Generate Words</span>.</li>
                <li>Wait a moment while words appear.</li>
                <li>Return here to start studying right away.</li>
              </ol>
            </div>
            <div className="space-y-4">
              <Link
                href="/manage"
                className="block bg-[var(--accent)] hover:brightness-95 text-[var(--btn-text-contrast)] font-bold py-4 px-8 rounded-2xl text-lg transition-colors shadow-lg"
              >
                ✨ Generate Words
              </Link>
              <Link
                href="/settings"
                className="block bg-[var(--accent-active)] hover:brightness-110 text-[var(--btn-text-contrast)] font-bold py-3 px-6 rounded-2xl text-md transition-colors shadow-md"
              >
                ⚙️ Settings
              </Link>
            </div>
            <p className="text-xs text-[var(--muted)]">All data stays on your device. You can export or clear it anytime.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-4">Great job!</h1>
          <p className="text-xl text-[var(--muted)] mb-8">
            No words are due for review right now. Come back later or add some new words to practice!
          </p>
          <div className="space-y-4">
            <Link 
              href="/manage"
              className="block bg-[var(--accent)] hover:brightness-95 text-[var(--btn-text-contrast)] font-bold py-4 px-8 rounded-2xl text-lg transition-colors shadow-lg"
            >
              📖 Manage Words
            </Link>
            <Link 
              href="/settings"
              className="block bg-[var(--accent-active)] hover:brightness-110 text-[var(--btn-text-contrast)] font-bold py-4 px-8 rounded-2xl text-lg transition-colors shadow-lg"
            >
              ⚙️ Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="bg-[var(--surface)] shadow-sm p-4 border-b border-[color:var(--border)]">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <h1 className="text-xl font-bold text-[var(--foreground)]">📖 Be-Spelling</h1>
          <DueBadge count={studyStats.due} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-20 pt-4">
        <div className="w-full max-w-md space-y-6">
          
          {/* Feedback Display */}
          {feedback && phase === 'rating' && (
            <div className="bg-[var(--surface)] rounded-2xl p-6 shadow-lg animate-bounce-in text-center border border-[color:var(--border)]">
              <p className="text-2xl font-bold text-[var(--foreground)]">{feedback}</p>
            </div>
          )}

          {/* Study Card */}
          {phase !== 'rating' && (
            <div className="bg-[var(--surface)] rounded-2xl shadow-xl p-8 animate-fade-in border border-[color:var(--border)]">
              
              {/* Listen Button */}
              <div className="text-center mb-8">
                <SpeakButton
                  text={currentWord.text}
                  onSpeakStart={handleSpeakStart}
                  onSpeakEnd={handleSpeakEnd}
                  className="w-full"
                />
              </div>

              {/* Letter Builder (mobile-friendly instead of typing) */}
              {phase !== 'listening' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                    Tap the letters in order:
                  </label>
                  <LetterBuilder
                    target={currentWord.text}
                    value={userInput}
                    onChange={setUserInput}
                    onComplete={() => {
                      // Auto-advance hint/answer controls remain; we just stay in typing phase
                    }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              {(phase === 'typing' || phase === 'hint') && (
                <div className="flex flex-wrap gap-3 mb-6 w-full">
                  {/* Hint button */}
                  {!showHint && (
                    <button
                      onClick={handleShowHint}
                      // Keep dark text in both themes for yellow background to maintain contrast (avoid white on bright yellow)
                      className="flex-1 min-w-[40%] bg-[var(--rate-almost)] hover:brightness-95 text-[var(--btn-text)] font-bold py-3 px-6 rounded-2xl transition-colors shadow-md"
                    >
                      💡 Hint
                    </button>
                  )}
                  {/* Always-visible Check button (replaces Show Word) */}
                  {!showAnswer && (
                    <button
                      onClick={handleCheck}
                      className="flex-1 min-w-[40%] bg-[var(--rate-nailed)] hover:brightness-95 text-[var(--btn-text)] dark:text-[var(--btn-text-contrast)] font-bold py-3 px-6 rounded-2xl transition-colors shadow-md"
                    >
                      ✅ Check
                    </button>
                  )}
                </div>
              )}

              {/* Answer Display */}
              {showAnswer && (
                <div className={`relative bg-[var(--surface-alt)] border-2 border-[color:var(--border)] rounded-2xl p-6 mb-6 text-center animate-fade-in ${wasCorrect ? 'ring-4 ring-[var(--rate-nailed)]/60' : ''}`}>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">The word is:</h3>
                  <p className="text-3xl font-bold text-[var(--foreground)] tracking-wider">{currentWord.text}</p>
                  {wasCorrect !== null && (
                    <div className="mt-4 text-xl font-semibold">
                      {wasCorrect ? '🎉 Correct! Great spelling!' : '✍️ Keep practicing!'}
                    </div>
                  )}
                  {celebrate && wasCorrect && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      {/* Simple emoji confetti */}
                      {[...Array(12)].map((_, i) => (
                        <span
                          key={i}
                          className="absolute text-2xl animate-bounce-in"
                          style={{
                            top: `${Math.random() * 80 + 5}%`,
                            left: `${Math.random() * 80 + 5}%`,
                            animationDelay: `${(i * 60)}ms`,
                          }}
                        >
                          {['🎉','✨','🌟','🎊','💥','⭐️'][i % 6]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hint Display */}
              <HintCard hint={currentWord.hint} isVisible={showHint} />

              {/* Rating Buttons */}
              {!autoRated && phase === 'answer' && (
                <div className="mt-6">
                  <RatingBar onRate={handleRating} />
                </div>
              )}
            </div>
          )}

          {/* Progress Stats */}
          <div className="bg-[var(--surface)] rounded-2xl p-4 shadow-md border border-[color:var(--border)]">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-[var(--foreground)]">{studyStats.total}</div>
                <div className="text-sm text-[var(--muted)]">Total Words</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--rate-almost)]">{studyStats.due}</div>
                <div className="text-sm text-[var(--muted)]">Due Today</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--rate-nailed)]">{studyStats.learned}</div>
                <div className="text-sm text-[var(--muted)]">Learned</div>
              </div>
            </div>
          </div>

          <AppFooter />
        </div>
      </div>
    </div>
  );
}
