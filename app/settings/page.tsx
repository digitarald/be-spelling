'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppFooter } from '@/components/ui/AppFooter';

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
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="bg-[var(--surface)] shadow-sm p-4 border-b border-[color:var(--border)]">
        <div className="flex items-center max-w-md mx-auto">
          <Link 
            href="/"
            className="text-[var(--accent)] hover:brightness-110 mr-4"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-[var(--foreground)]">⚙️ Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Success Message */}
        {showSuccess && (
          <div className="bg-[var(--rate-nailed)]/30 border-2 border-[color:var(--rate-nailed)] rounded-2xl p-4 text-center animate-bounce-in">
            <p className="text-[var(--foreground)] font-semibold">✅ Settings saved!</p>
          </div>
        )}

        {/* Prompt Template */}
        <div className="bg-[var(--surface)] rounded-2xl p-6 shadow-lg border border-[color:var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            📝 Word Generation Prompt
          </h2>
          <textarea
            value={settings.promptTemplate}
            onChange={(e) => setSettings(prev => ({ ...prev, promptTemplate: e.target.value }))}
            className="w-full p-4 border-2 border-[color:var(--border)] rounded-xl focus:border-[color:var(--accent-active)] focus:outline-none resize-none bg-[var(--surface-alt)] text-[var(--foreground)]"
            rows={4}
            placeholder="Describe what kind of spelling words you want..."
          />
          <p className="text-sm text-[var(--muted)] mt-2">
            Customize the prompt to generate words appropriate for your child's level and interests.
          </p>
        </div>

        {/* Voice Settings */}
        <div className="bg-[var(--surface)] rounded-2xl p-6 shadow-lg border border-[color:var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            🔊 Voice & Speech
          </h2>

          {/* Voice Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--muted)] mb-2">Voice</label>
            <select
              value={settings.selectedVoice}
              onChange={(e) => setSettings(prev => ({ ...prev, selectedVoice: e.target.value }))}
              className="w-full p-3 border-2 border-[color:var(--border)] rounded-xl focus:border-[color:var(--accent-active)] focus:outline-none bg-[var(--surface-alt)] text-[var(--foreground)]"
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
            <label className="block text-sm font-medium text-[var(--muted)] mb-2">
              Speech Rate: {settings.speechRate}
            </label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={settings.speechRate}
              onChange={(e) => setSettings(prev => ({ ...prev, speechRate: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-[var(--surface-alt)] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
              <span>Slower</span>
              <span>Faster</span>
            </div>
          </div>

          {/* Speech Pitch */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--muted)] mb-2">
              Speech Pitch: {settings.speechPitch}
            </label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={settings.speechPitch}
              onChange={(e) => setSettings(prev => ({ ...prev, speechPitch: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-[var(--surface-alt)] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
              <span>Lower</span>
              <span>Higher</span>
            </div>
          </div>

          {/* Test Voice Button */}
          <button
            onClick={testVoice}
            className="w-full bg-[var(--accent)] hover:brightness-95 text-[var(--btn-text-contrast)] font-bold py-3 px-4 rounded-xl transition-colors shadow-md"
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
              ? 'bg-[var(--muted)] cursor-not-allowed text-[var(--btn-text-contrast)]' 
              : 'bg-[var(--rate-nailed)] hover:brightness-95 active:scale-95 text-[var(--btn-text)] dark:text-[var(--btn-text-contrast)]'
            }
          `}
        >
          {isSaving ? '💾 Saving...' : '💾 Save Settings'}
        </button>
        <AppFooter />
      </div>
    </div>
  );
}