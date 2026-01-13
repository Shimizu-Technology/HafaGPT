import { useState, useCallback, useEffect, useRef } from 'react';

// Global audio cache - persists across component instances
const audioCache = new Map<string, string>(); // text -> audioUrl
const preloadingPromises = new Map<string, Promise<boolean>>(); // text -> preload promise

// Pre-generated audio manifest (loaded from S3)
// Maps Chamorro text to filename
const STATIC_AUDIO_BASE_URL = 'https://hafagpt.s3.ap-southeast-2.amazonaws.com/audio/';
let staticAudioManifest: Record<string, string> | null = null;
let manifestLoaded = false;
let manifestLoading = false;

/**
 * Load the pre-generated audio manifest from S3
 */
async function loadStaticAudioManifest(): Promise<void> {
  if (manifestLoaded || manifestLoading) return;
  
  manifestLoading = true;
  try {
    // Add cache-buster to manifest fetch to get latest version
    const response = await fetch(`${STATIC_AUDIO_BASE_URL}manifest.json?t=${Date.now()}`);
    if (response.ok) {
      const manifest = await response.json();
      staticAudioManifest = {};
      // Update manifest load time for cache-busting audio URLs
      manifestLoadTime = Date.now();
      // Build lookup: Chamorro text -> filename
      for (const [text, info] of Object.entries(manifest.words || {})) {
        staticAudioManifest[text] = (info as { file: string }).file;
        // Also add lowercase version for case-insensitive matching
        staticAudioManifest[text.toLowerCase()] = (info as { file: string }).file;
      }
      console.log(`📋 Loaded static audio manifest: ${Object.keys(staticAudioManifest).length / 2} words`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to load static audio manifest:', error);
  } finally {
    manifestLoaded = true;
    manifestLoading = false;
  }
}

/**
 * Get the static audio URL for a word if available
 * Includes cache-busting parameter based on manifest load time
 */
let manifestLoadTime = Date.now();

function getStaticAudioUrl(text: string): string | null {
  if (!staticAudioManifest) return null;
  
  // Try exact match first, then lowercase
  const filename = staticAudioManifest[text] || staticAudioManifest[text.toLowerCase()];
  if (filename) {
    // Add cache-buster to ensure we get the latest audio after regeneration
    return `${STATIC_AUDIO_BASE_URL}${filename}?v=${manifestLoadTime}`;
  }
  return null;
}

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
  // Also load static audio manifest on first use
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
      console.warn('Speech Synthesis not supported in this browser');
    }
    // Load static audio manifest in background
    loadStaticAudioManifest();
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
      // Stop any currently playing audio first
      if (audioRef.current) {
        console.log('🛑 Stopping previous audio');
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      
      setIsSpeaking(true);
      
      // Check cache FIRST before making API call
      const cachedUrl = audioCache.get(text);
      if (cachedUrl) {
        console.log(`⚡ Playing from cache: "${text}"`);
        const audio = new Audio(cachedUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          console.log('✅ Cache playback finished');
          setIsSpeaking(false);
          audioRef.current = null;
        };
        
        await audio.play();
        return true;
      }
      
      console.log(`🔊 TTS request for: "${text}" (${text.length} chars)`);
      
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
      
      const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log(`📦 Audio received: ${audioBlob.size} bytes`);
      
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
      
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => {
          console.log(`⏱️ Audio ready: ${audio.duration.toFixed(2)}s`);
          resolve();
        };
        audio.onerror = (e) => reject(new Error('Audio load failed: ' + e));
        audio.src = audioUrl;
        audio.load();
      });
      
      // Validate audio duration before caching
      // Minimum expected: 0.3s base + 0.04s per character
      const minExpectedDuration = Math.max(0.3, text.length * 0.04);
      
      if (audio.duration >= minExpectedDuration) {
        // Audio seems complete - cache it for consistent playback
        audioCache.set(text, audioUrl);
        console.log(`💾 Cached audio for: "${text}" (${audio.duration.toFixed(2)}s >= ${minExpectedDuration.toFixed(2)}s min)`);
      } else {
        // Audio seems truncated - don't cache, let user try again
        console.warn(`⚠️ Audio too short (${audio.duration.toFixed(2)}s < ${minExpectedDuration.toFixed(2)}s), not caching`);
      }
      
      audio.onended = () => {
        console.log('✅ OpenAI TTS playback finished');
        setIsSpeaking(false);
        audioRef.current = null;
      };
      
      audio.currentTime = 0;
      await audio.play();
      console.log('✅ OpenAI TTS playing');
      
      return true;
      
    } catch (error) {
      console.warn('⚠️ OpenAI TTS failed:', error);
      setIsSpeaking(false);
      audioRef.current = null;
      return false;
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
    // Has static audio - no need to preload
    if (getStaticAudioUrl(text)) {
      return Promise.resolve(true);
    }
    
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
   * Play from pre-generated static audio (S3)
   * Returns true if static audio was found and played
   */
  const playFromStatic = useCallback(async (text: string): Promise<boolean> => {
    const staticUrl = getStaticAudioUrl(text);
    if (!staticUrl) return false;
    
    try {
      console.log(`🎯 Playing pre-generated audio: "${text}"`);
      setIsSpeaking(true);
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      const audio = new Audio(staticUrl);
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
      
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error('Static audio load failed'));
        audio.load();
      });
      
      audio.onended = () => {
        console.log('✅ Static audio finished');
        setIsSpeaking(false);
        audioRef.current = null;
      };
      
      await audio.play();
      console.log('✅ Static audio playing');
      return true;
      
    } catch (error) {
      console.warn(`⚠️ Static audio failed for "${text}":`, error);
      setIsSpeaking(false);
      audioRef.current = null;
      return false;
    }
  }, []);

  /**
   * Main speak function - checks static audio, cache, then OpenAI
   * Priority: Pre-generated S3 → Cache → OpenAI API → Browser fallback
   */
  const speak = useCallback(async (text: string) => {
    // 1. Try pre-generated static audio first (most consistent!)
    const staticSuccess = await playFromStatic(text);
    if (staticSuccess) return;
    
    // 2. If preload is in progress, wait for it instead of making duplicate request
    const pendingPreload = preloadingPromises.get(text);
    if (pendingPreload) {
      console.log(`⏳ Waiting for preload: "${text}"...`);
      await pendingPreload;
    }
    
    // 3. Try cache (should be populated now if preload succeeded)
    const cachedSuccess = await playFromCache(text);
    if (cachedSuccess) return;
    
    // 4. Try OpenAI TTS (preload failed or wasn't started)
    const success = await speakOpenAI(text);
    
    // 5. If failed, fallback to browser TTS
    if (!success) {
      console.log('⚠️ OpenAI TTS unavailable, using browser TTS fallback');
      speakBrowser(text);
    }
  }, [playFromStatic, playFromCache, speakOpenAI, speakBrowser]);

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
   * Clear cached audio for a specific word (or all if no text provided)
   * Useful when cached audio sounds wrong
   */
  const clearCache = useCallback((text?: string) => {
    if (text) {
      const url = audioCache.get(text);
      if (url) {
        URL.revokeObjectURL(url);
        audioCache.delete(text);
        console.log(`🗑️ Cache cleared for: "${text}"`);
      }
    } else {
      // Clear all cache
      audioCache.forEach((url) => URL.revokeObjectURL(url));
      audioCache.clear();
      console.log('🗑️ All TTS cache cleared');
    }
  }, []);

  /**
   * Speak with force refresh - clears cache and fetches fresh audio
   * Use when the cached pronunciation sounds wrong
   */
  const speakFresh = useCallback(async (text: string) => {
    clearCache(text);
    const success = await speakOpenAI(text);
    if (!success) {
      console.log('⚠️ Fresh TTS failed, using browser fallback');
      speakBrowser(text);
    }
  }, [clearCache, speakOpenAI, speakBrowser]);

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
    speakFresh,  // Force refresh - clears cache and fetches new
    preload,
    stop,
    clearCache,  // Manual cache control
    extractChamorroText,
    isSpeaking,
    isPreloading,
    isSupported
  };
}
