'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Word } from '@/lib/types';
import { wordRepository, reviewRepository, srsRepository } from '@/lib/storage/repositories';

interface WordWithStats extends Word {
  reviewCount: number;
  lastReviewed?: Date;
  interval: number;
  nextDue?: Date;
}

export default function ManagePage() {
  const [words, setWords] = useState<WordWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [importData, setImportData] = useState('');
  const [stats, setStats] = useState({ total: 0, due: 0, learned: 0 });

  const loadWords = async () => {
    try {
      const allWords = await wordRepository.getAllWords();
      const allSRS = await srsRepository.getAllSRS();
      // Auto-initialize SRS for any words missing scheduling (migration / safety net)
      const missing = allWords.filter(w => !allSRS.find(s => s.wordId === w.id));
      if (missing.length > 0) {
        await Promise.all(missing.map(w => srsRepository.initializeSRS(w.id)));
      }
      const refreshedSRS = missing.length > 0 ? await srsRepository.getAllSRS() : allSRS;
      
      const wordsWithStats: WordWithStats[] = await Promise.all(
        allWords.map(async (word) => {
          const reviews = await reviewRepository.getReviews(word.id);
          const srs = refreshedSRS.find(s => s.wordId === word.id);
          
          return {
            ...word,
            reviewCount: reviews.length,
            lastReviewed: reviews.length > 0 ? new Date(Math.max(...reviews.map(r => r.ts))) : undefined,
            interval: srs?.interval || 0,
            nextDue: srs ? new Date(srs.due) : undefined
          };
        })
      );

      // Sort by next due date
      wordsWithStats.sort((a, b) => {
        if (!a.nextDue && !b.nextDue) return 0;
        if (!a.nextDue) return 1;
        if (!b.nextDue) return -1;
        return a.nextDue.getTime() - b.nextDue.getTime();
      });

      setWords(wordsWithStats);

      // Calculate stats
      const now = new Date();
      const due = wordsWithStats.filter(w => w.nextDue && w.nextDue <= now).length;
      const learned = wordsWithStats.filter(w => w.interval >= 21).length;
      
      setStats({
        total: wordsWithStats.length,
        due,
        learned
      });

    } catch (error) {
      console.error('Error loading words:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewWords = async () => {
    setIsGenerating(true);
    try {
      // Get settings from localStorage
      const savedSettings = localStorage.getItem('be-spelling-settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      
      const promptTemplate = settings.promptTemplate || 
        '5th-grade level spelling words, mix of multisyllabic words, no proper nouns, focus on commonly misspelled words';

      const response = await fetch('/api/generate-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ promptTemplate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate words');
      }

      const data = await response.json();
      
  // Add words to database and initialize SRS scheduling so they appear immediately
  const newIds = await wordRepository.addWords(data.words);
  await Promise.all(newIds.map(id => srsRepository.initializeSRS(id)));
      
      // Reload words
      await loadWords();

    } catch (error) {
      console.error('Error generating words:', error);
      alert('Error generating words: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteWord = async (wordId: string) => {
    try {
      await wordRepository.deleteWord(wordId);
      await loadWords();
    } catch (error) {
      console.error('Error deleting word:', error);
    }
  };

  const clearAllWords = async () => {
    try {
      await wordRepository.clearAll();
      await loadWords();
    } catch (error) {
      console.error('Error clearing all words:', error);
    }
  };

  const exportData = async () => {
    try {
      const data = await wordRepository.exportData();
      const jsonString = JSON.stringify(data, null, 2);
      
      // Create and trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `be-spelling-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data');
    }
  };

  const importDataFromFile = async () => {
    if (!importData.trim()) return;
    
    try {
      const data = JSON.parse(importData);
      
      // Validate data structure
      if (!data.words || !Array.isArray(data.words)) {
        throw new Error('Invalid data format');
      }
      
      const isConfirmed = confirm(
        `This will replace all current data with ${data.words.length} words. Continue?`
      );
      
      if (isConfirmed) {
        await wordRepository.importData(data);
        await loadWords();
        setImportData('');
        setShowImportExport(false);
      }
      
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Error importing data: ' + (error as Error).message);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return date.toLocaleDateString();
  };

  const formatNextDue = (date: Date | undefined) => {
    if (!date) return 'Not scheduled';
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff <= 0) return 'Due now';
    if (diff === 1) return 'Due tomorrow';
    if (diff < 7) return `Due in ${diff} days`;
    return `Due ${date.toLocaleDateString()}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">📚</div>
          <p className="text-xl font-semibold text-gray-600">Loading words...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center">
            <Link 
              href="/"
              className="text-blue-600 hover:text-blue-800 mr-4"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-800">📚 Manage Words</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.due}</div>
              <div className="text-sm text-gray-600">Due</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.learned}</div>
              <div className="text-sm text-gray-600">Learned</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={generateNewWords}
            disabled={isGenerating}
            className={`
              w-full font-bold py-4 px-6 rounded-2xl text-lg shadow-lg transition-all
              ${isGenerating 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
              } text-white
            `}
          >
            {isGenerating ? '🔄 Generating...' : '✨ Generate New Words'}
          </button>
          <button
            onClick={clearAllWords}
            disabled={words.length === 0}
            className={`
              w-full font-bold py-3 px-6 rounded-2xl text-md shadow-lg transition-all
              ${words.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 active:scale-95 text-white'
              }
            `}
          >
            🧹 Clear All Words
          </button>
          
          <button
            onClick={() => setShowImportExport(!showImportExport)}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-2xl transition-colors shadow-md"
          >
            📁 Import / Export
          </button>
        </div>

        {/* Import/Export Panel */}
        {showImportExport && (
          <div className="bg-white rounded-2xl p-6 shadow-lg animate-fade-in">
            <h3 className="font-bold text-gray-800 mb-4">📁 Import / Export Data</h3>
            
            <div className="space-y-4">
              <button
                onClick={exportData}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                📥 Export Data
              </button>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import Data (JSON)
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                  rows={4}
                  placeholder="Paste exported JSON data here..."
                />
                <button
                  onClick={importDataFromFile}
                  disabled={!importData.trim()}
                  className={`
                    w-full mt-2 font-bold py-3 px-4 rounded-xl transition-colors
                    ${importData.trim() 
                      ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  📤 Import Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Word List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-bold text-gray-800">📝 Word List ({words.length})</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {words.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">📝</div>
                <p>No words yet! Generate some to get started.</p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {words.map((word) => (
                  <div key={word.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-800">{word.text}</h4>
                        <p className="text-sm text-gray-600 mb-2">{word.hint}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>📊 {word.reviewCount} reviews</span>
                          <span>🕒 {formatNextDue(word.nextDue)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteWord(word.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Link 
            href="/"
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-2xl text-center transition-colors shadow-md"
          >
            📖 Study
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
  );
}