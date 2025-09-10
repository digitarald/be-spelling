'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AppSettings {
  promptTemplate: string;
  selectedVoice: string;
  speechRate: number;
  speechPitch: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  promptTemplate: '5th-grade level spelling words, mix of multisyllabic words, no proper nouns, focus on commonly misspelled words',
  selectedVoice: '',
  speechRate: 0.8,
  speechPitch: 1.0,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('be-spelling-settings');
    if (savedSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    }
  }, []);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Set default voice if none selected
      if (!settings.selectedVoice && voices.length > 0) {
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.localService
        ) || voices[0];
        
        setSettings(prev => ({
          ...prev,
          selectedVoice: englishVoice.name
        }));
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [settings.selectedVoice]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    // Save to localStorage
    localStorage.setItem('be-spelling-settings', JSON.stringify(settings));
    
    // Simulate save delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const testVoice = () => {
    if (!settings.selectedVoice) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Hello! This is how I sound.');
    
    const voice = availableVoices.find(v => v.name === settings.selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = settings.speechRate;
    utterance.pitch = settings.speechPitch;
    utterance.volume = 0.9;

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center max-w-md mx-auto">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 mr-4"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-800">⚙️ Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-100 border-2 border-green-300 rounded-2xl p-4 text-center animate-bounce-in">
            <p className="text-green-800 font-semibold">✅ Settings saved!</p>
          </div>
        )}

        {/* AI Model Info */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            🤖 AI Model
          </h2>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-700 font-medium">Google Gemini 2.5 Flash</p>
            <p className="text-sm text-gray-500 mt-1">
              Fast and efficient model optimized for educational content generation.
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            To use a different model, set <code className="bg-gray-200 px-1 rounded text-xs">OPENROUTER_DEFAULT_MODEL</code> in your environment.
          </p>
        </div>

        {/* Prompt Template */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📝 Word Generation Prompt
          </h2>
          <textarea
            value={settings.promptTemplate}
            onChange={(e) => setSettings(prev => ({ ...prev, promptTemplate: e.target.value }))}
            className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
            rows={4}
            placeholder="Describe what kind of spelling words you want..."
          />
          <p className="text-sm text-gray-500 mt-2">
            Customize the prompt to generate words appropriate for your child's level and interests.
          </p>
        </div>

        {/* Voice Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            🔊 Voice & Speech
          </h2>
          
          {/* Voice Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
            <select
              value={settings.selectedVoice}
              onChange={(e) => setSettings(prev => ({ ...prev, selectedVoice: e.target.value }))}
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="">Default Voice</option>
              {availableVoices
                .filter(voice => voice.lang.startsWith('en'))
                .map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
            </select>
          </div>

          {/* Speech Rate */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Speech Rate: {settings.speechRate}
            </label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={settings.speechRate}
              onChange={(e) => setSettings(prev => ({ ...prev, speechRate: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Slower</span>
              <span>Faster</span>
            </div>
          </div>

          {/* Speech Pitch */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Speech Pitch: {settings.speechPitch}
            </label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={settings.speechPitch}
              onChange={(e) => setSettings(prev => ({ ...prev, speechPitch: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Lower</span>
              <span>Higher</span>
            </div>
          </div>

          {/* Test Voice Button */}
          <button
            onClick={testVoice}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md"
          >
            🔊 Test Voice
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={`
            w-full font-bold py-4 px-6 rounded-2xl text-lg shadow-lg transition-all
            ${isSaving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-500 hover:bg-green-600 active:scale-95'
            } text-white
          `}
        >
          {isSaving ? '💾 Saving...' : '💾 Save Settings'}
        </button>

        {/* Environment Variable Notice */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">📋 Setup Required</h3>
          <p className="text-sm text-yellow-700 mb-2">
            To generate new words, add your OpenRouter API key to <code className="bg-yellow-200 px-1 rounded">.env.local</code>:
          </p>
          <code className="block bg-yellow-100 p-2 rounded text-xs font-mono mb-2">
            OPENROUTER_API_KEY=your_api_key_here
          </code>
          <p className="text-sm text-yellow-700">
            Optional: Override the default model (Google Gemini 2.5 Flash):
          </p>
          <code className="block bg-yellow-100 p-2 rounded text-xs font-mono">
            OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
          </code>
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
            href="/manage"
            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-2xl text-center transition-colors shadow-md"
          >
            📚 Manage Words
          </Link>
        </div>
      </div>
    </div>
  );
}