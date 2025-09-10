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

export default function StudyPage() {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState<StudyPhase>('listening');
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
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
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">📚</div>
          <p className="text-xl font-semibold text-gray-600">Loading your words...</p>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    if (isOnboarding) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 flex flex-col items-center justify-center px-6">
          <div className="text-center max-w-md space-y-6 animate-fade-in">
            <div className="text-8xl mb-2">✨</div>
            <h1 className="text-3xl font-bold text-gray-800">Welcome to Be-Spelling!</h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              Let&apos;s generate your first batch of spelling words using the AI word generator.
              You&apos;ll then listen, build the word from letters, and rate how well you knew it.
            </p>
            <div className="bg-white/70 backdrop-blur rounded-2xl p-5 shadow-md text-left text-gray-700 space-y-2">
              <p className="font-semibold text-gray-800">Getting started:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Tap <span className="font-semibold">Generate Words</span>.</li>
                <li>Wait a moment while words appear.</li>
                <li>Return here to start studying right away.</li>
              </ol>
            </div>
            <div className="space-y-4">
              <Link
                href="/manage"
                className="block bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-colors shadow-lg"
              >
                ✨ Generate Words
              </Link>
              <Link
                href="/settings"
                className="block bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-2xl text-md transition-colors shadow-md"
              >
                ⚙️ Settings
              </Link>
            </div>
            <p className="text-xs text-gray-500">All data stays on your device. You can export or clear it anytime.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-blue-100 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Great job!</h1>
          <p className="text-xl text-gray-600 mb-8">
            No words are due for review right now. Come back later or add some new words to practice!
          </p>
          <div className="space-y-4">
            <Link 
              href="/manage"
              className="block bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-colors shadow-lg"
            >
              📖 Manage Words
            </Link>
            <Link 
              href="/settings"
              className="block bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-colors shadow-lg"
            >
              ⚙️ Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <h1 className="text-xl font-bold text-gray-800">📖 Be-Spelling</h1>
          <DueBadge count={studyStats.due} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-20 pt-4">
        <div className="w-full max-w-md space-y-6">
          
          {/* Feedback Display */}
          {feedback && phase === 'rating' && (
            <div className="bg-white rounded-2xl p-6 shadow-lg animate-bounce-in text-center">
              <p className="text-2xl font-bold text-gray-800">{feedback}</p>
            </div>
          )}

          {/* Study Card */}
          {phase !== 'rating' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
              
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  {!showHint && (
                    <button
                      onClick={handleShowHint}
                      className="flex-1 min-w-[40%] bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-2xl transition-colors shadow-md"
                    >
                      💡 Hint
                    </button>
                  )}
                  {!showAnswer && (
                    <button
                      onClick={handleShowAnswer}
                      className="flex-1 min-w-[40%] bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-2xl transition-colors shadow-md"
                    >
                      👁️ Show Word
                    </button>
                  )}
                  {!showAnswer && userInput.length === currentWord.text.length && (
                    <button
                      onClick={() => { setShowAnswer(true); setPhase('answer'); }}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-2xl transition-colors shadow-md"
                    >
                      ✅ Check
                    </button>
                  )}
                </div>
              )}

              {/* Answer Display */}
              {showAnswer && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6 text-center animate-fade-in">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">The word is:</h3>
                  <p className="text-3xl font-bold text-blue-900 tracking-wider">{currentWord.text}</p>
                </div>
              )}

              {/* Hint Display */}
              <HintCard hint={currentWord.hint} isVisible={showHint} />

              {/* Rating Buttons */}
              {(showAnswer || phase === 'answer') && (
                <div className="mt-6">
                  <RatingBar onRate={handleRating} />
                </div>
              )}
            </div>
          )}

          {/* Progress Stats */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800">{studyStats.total}</div>
                <div className="text-sm text-gray-600">Total Words</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{studyStats.due}</div>
                <div className="text-sm text-gray-600">Due Today</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{studyStats.learned}</div>
                <div className="text-sm text-gray-600">Learned</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Link 
              href="/manage"
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-2xl text-center transition-colors shadow-md"
            >
              📖 Manage
            </Link>
            <Link 
              href="/settings"
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-2xl text-center transition-colors shadow-md"
            >
              ⚙️ Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
