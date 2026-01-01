import { useState, useCallback, useEffect, useRef } from 'react';

// Global audio cache - persists across component instances
const audioCache = new Map<string, string>(); // text -> audioUrl
const preloadingPromises = new Map<string, Promise<boolean>>(); // text -> preload promise

/**
 * Hook for text-to-speech functionality with automatic fallback
 * 
 * Strategy:
 * 1. Check cache for preloaded audio (instant!)
 * 2. Try OpenAI TTS if not cached (best quality)
 * 3. If fails (no internet, API error), fallback to Browser TTS
 * 
 * Uses Spanish (es-ES) for browser TTS as closest approximation for Chamorro
 */
export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isPreloading, setIsPreloading] = useState(false);
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
      console.log(`🔊 TTS request for: "${text}" (${text.length} chars) with voice: ${voice}`);
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
   * Preload audio for text (fetches in background, stores in cache)
   * Call this when you know you'll need the audio soon
   * Returns a promise that resolves when preload is complete
   */
  const preload = useCallback((text: string, voice: string = 'shimmer'): Promise<boolean> => {
    // Already cached
    if (audioCache.has(text)) {
      return Promise.resolve(true);
    }
    
    // Already being preloaded - return existing promise so callers can wait
    const existingPromise = preloadingPromises.get(text);
    if (existingPromise) {
      return existingPromise;
    }
    
    // Start new preload
    setIsPreloading(true);
    
    const preloadPromise = (async () => {
      try {
        console.log(`📦 Preloading TTS for: "${text}"...`);
        
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        const response = await fetch(`${API_URL}/api/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ text, voice })
        });
        
        if (!response.ok) {
          throw new Error(`TTS API failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert base64 to audio blob URL and cache it
        const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        audioCache.set(text, audioUrl);
        console.log(`✅ Preloaded: "${text}"`);
        
        return true;
      } catch (error) {
        console.warn(`⚠️ Preload failed for: "${text}"`, error);
        return false;
      } finally {
        preloadingPromises.delete(text);
        setIsPreloading(preloadingPromises.size > 0);
      }
    })();
    
    preloadingPromises.set(text, preloadPromise);
    return preloadPromise;
  }, []);

  /**
   * Play from cache if available (instant!)
   */
  const playFromCache = useCallback(async (text: string): Promise<boolean> => {
    const cachedUrl = audioCache.get(text);
    if (!cachedUrl) return false;
    
    try {
      console.log(`⚡ Playing from cache: "${text}"`);
      setIsSpeaking(true);
      
      const audio = new Audio(cachedUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        audioRef.current = null;
        // Remove invalid cache entry
        audioCache.delete(text);
      };
      
      await audio.play();
      return true;
    } catch (error) {
      console.warn('Cache playback failed:', error);
      setIsSpeaking(false);
      return false;
    }
  }, []);

  /**
   * Main speak function - waits for preload if in progress, checks cache, then tries OpenAI
   */
  const speak = useCallback(async (text: string) => {
    // 1. If preload is in progress, wait for it instead of making duplicate request
    const pendingPreload = preloadingPromises.get(text);
    if (pendingPreload) {
      console.log(`⏳ Waiting for preload: "${text}"...`);
      await pendingPreload;
    }
    
    // 2. Try cache (should be populated now if preload succeeded)
    const cachedSuccess = await playFromCache(text);
    if (cachedSuccess) return;
    
    // 3. Try OpenAI TTS (preload failed or wasn't started)
    const success = await speakOpenAI(text);
    
    // 4. If failed, fallback to browser TTS
    if (!success) {
      console.log('⚠️ OpenAI TTS unavailable, using browser TTS fallback');
      speakBrowser(text);
    }
  }, [playFromCache, speakOpenAI, speakBrowser]);

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
    preload,
    stop,
    extractChamorroText,
    isSpeaking,
    isPreloading,
    isSupported
  };
}
