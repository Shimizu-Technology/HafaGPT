import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for text-to-speech functionality with automatic fallback
 * 
 * Strategy:
 * 1. Try OpenAI TTS first (best quality)
 * 2. If fails (no internet, API error), fallback to Browser TTS
 * 
 * Uses Spanish (es-ES) for browser TTS as closest approximation for Chamorro
 */
export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if Speech Synthesis is supported (for fallback)
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
      console.warn('Speech Synthesis not supported in this browser');
    }
  }, []);

  /**
   * Convert base64 audio to playable Blob
   */
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  /**
   * Speak using OpenAI TTS HD (highest quality, requires internet)
   * 
   * @param voice - Voice to use (alloy, echo, fable, onyx, nova, shimmer)
   *                shimmer = Best for Spanish/Chamorro
   *                alloy = Also good for multilingual
   */
  const speakOpenAI = useCallback(async (text: string, voice: string = 'shimmer'): Promise<boolean> => {
    try {
      console.log(`🔊 Attempting OpenAI TTS HD with voice: ${voice}...`);
      setIsSpeaking(true);
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Call backend TTS endpoint
      const response = await fetch(`${API_URL}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text,
          voice // Pass the voice parameter
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convert base64 to audio
      const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        console.log('✅ OpenAI TTS playback finished');
      };
      
      audio.onerror = (e) => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        console.error('❌ Audio playback failed:', e);
        throw new Error('Audio playback failed');
      };
      
      await audio.play();
      console.log('✅ OpenAI TTS playing');
      
      return true; // Success
      
    } catch (error) {
      console.warn('⚠️ OpenAI TTS failed:', error);
      setIsSpeaking(false);
      audioRef.current = null;
      return false; // Failed
    }
  }, []);

  /**
   * Speak using Browser TTS (free, works offline)
   */
  const speakBrowser = useCallback((text: string) => {
    if (!isSupported) {
      console.warn('Browser TTS not supported');
      return;
    }

    console.log('🔊 Using Browser TTS fallback...');

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean the text (remove markdown, special chars)
    const cleanText = text
      .replace(/[*_~`#]/g, '') // Remove markdown
      .replace(/\n/g, ' ')      // Replace newlines with spaces
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Configure voice settings
    utterance.lang = 'es-ES';  // Spanish approximation for Chamorro
    utterance.rate = 0.85;     // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Track speaking state
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('✅ Browser TTS speaking');
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      console.log('✅ Browser TTS finished');
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      console.error('❌ Browser TTS failed');
    };

    // Speak!
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  /**
   * Main speak function - tries OpenAI first, falls back to browser
   */
  const speak = useCallback(async (text: string) => {
    // Try OpenAI TTS first
    const success = await speakOpenAI(text);
    
    // If failed, fallback to browser TTS
    if (!success) {
      console.log('⚠️ OpenAI TTS unavailable, using browser TTS fallback');
      speakBrowser(text);
    }
  }, [speakOpenAI, speakBrowser]);

  /**
   * Stop any ongoing speech
   */
  const stop = useCallback(() => {
    // Stop OpenAI audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Stop browser TTS
    window.speechSynthesis.cancel();
    
    setIsSpeaking(false);
    console.log('🛑 Speech stopped');
  }, []);

  /**
   * Extract Chamorro text from mixed content
   * For now, just return the full content
   */
  const extractChamorroText = useCallback((content: string): string => {
    // Just return full content - TTS will handle both English and Chamorro
    return content;
  }, []);

  return {
    speak,
    stop,
    extractChamorroText,
    isSpeaking,
    isSupported
  };
}
