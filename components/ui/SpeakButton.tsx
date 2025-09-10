'use client';

import { useState, useEffect } from 'react';

interface SpeakButtonProps {
  text: string;
  className?: string;
  disabled?: boolean;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

export function SpeakButton({ text, className = '', disabled = false, onSpeakStart, onSpeakEnd }: SpeakButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  const handleSpeak = () => {
    if (!isSupported || disabled || isSpeaking) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    utterance.onstart = () => {
      setIsSpeaking(true);
      onSpeakStart?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onSpeakEnd?.();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      onSpeakEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported) {
    return (
      <button disabled className={`${className} opacity-50 cursor-not-allowed`}>
        🔇 Not supported
      </button>
    );
  }

  return (
    <button
      onClick={handleSpeak}
      disabled={disabled || isSpeaking}
      className={`
        ${className}
        ${isSpeaking ? 'animate-pulse bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        transition-all duration-200 text-white font-bold py-4 px-8 rounded-full text-lg
        shadow-lg touch-manipulation
      `}
    >
      {isSpeaking ? '🔊 Speaking...' : '🔊 Listen'}
    </button>
  );
}