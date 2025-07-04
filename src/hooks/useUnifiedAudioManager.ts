import { useCallback, useEffect, useRef } from 'react';
import { detectDeviceCapabilities, getPerformanceSettings } from '../lib/device-performance';

interface AudioInstance {
  audio: HTMLAudioElement;
  isPlaying: boolean;
  lastUsed: number;
}

interface AudioPool {
  [key: string]: AudioInstance[];
}

export const useUnifiedAudioManager = (isMuted: boolean) => {
  const audioPoolRef = useRef<AudioPool>({});
  const capabilitiesRef = useRef(detectDeviceCapabilities());
  const settingsRef = useRef(getPerformanceSettings(capabilitiesRef.current));
  const contextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);
  const preloadedRef = useRef<Set<string>>(new Set());

  // Initialize Web Audio Context for mobile
  const initializeAudioContext = useCallback(() => {
    if (isInitializedRef.current || !capabilitiesRef.current.isMobile) return;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        contextRef.current = new AudioContext();
        isInitializedRef.current = true;
        console.log('🔊 Audio context initialized:', contextRef.current.state);
      }
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
    }
  }, []);

  // Create optimized audio instances
  const createAudioInstance = useCallback((src: string, volume: number = 1): HTMLAudioElement => {
    const audio = new Audio();
    
    if (capabilitiesRef.current.isMobile) {
      audio.preload = 'metadata';
      (audio as any).playsInline = true;
    } else {
      audio.preload = 'auto';
    }
    
    audio.src = src;
    audio.volume = volume;
    
    // Error handling - only log persistent failures
    let errorCount = 0;
    audio.addEventListener('error', () => {
      errorCount++;
      // Only log after multiple failures to avoid noise from normal browser behavior
      if (errorCount > 2) {
        console.warn(`Persistent audio load failure: ${src}`);
      }
    });
    
    // Success handling
    audio.addEventListener('canplaythrough', () => {
      if (errorCount > 0) {
        console.log(`✅ Audio loaded successfully after ${errorCount} retries: ${src}`);
      }
    });

    return audio;
  }, []);

  // Preload audio with device-optimized strategy
  const preloadSound = useCallback(async (src: string, poolSize?: number, volume: number = 1) => {
    if (typeof window === 'undefined' || preloadedRef.current.has(src)) {
      return;
    }

    const settings = settingsRef.current;
    const actualPoolSize = poolSize || (capabilitiesRef.current.isMobile ? 
      settings.audioSettings.poolSize : 3);
    
    // Skip preloading on low-end devices if disabled
    if (capabilitiesRef.current.isMobile && !settings.audioSettings.preloadAll && capabilitiesRef.current.isLowEnd) {
      return;
    }

    console.log(`🔊 Preloading audio (${capabilitiesRef.current.isMobile ? 'mobile' : 'desktop'}): ${src}`);

    if (!audioPoolRef.current[src]) {
      audioPoolRef.current[src] = [];
    }

    // Progressive loading for mobile, parallel for desktop
    if (capabilitiesRef.current.isMobile) {
      for (let i = 0; i < actualPoolSize; i++) {
        const audio = createAudioInstance(src, volume);
        audioPoolRef.current[src].push({
          audio,
          isPlaying: false,
          lastUsed: 0
        });
        
        if (i < actualPoolSize - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } else {
      // Desktop: parallel loading
      const promises = Array.from({ length: actualPoolSize }, () => {
        const audio = createAudioInstance(src, volume);
        return new Promise<AudioInstance>((resolve) => {
          const instance = {
            audio,
            isPlaying: false,
            lastUsed: 0
          };
          audioPoolRef.current[src].push(instance);
          resolve(instance);
        });
      });
      
      await Promise.all(promises);
    }
    
    preloadedRef.current.add(src);
  }, [createAudioInstance]);

  // Play sound with device optimizations
  const playSound = useCallback((src: string) => {
    if (isMuted) {
      console.log('🔇 Sound muted:', src);
      return;
    }

    console.log(`🔊 Playing sound (${capabilitiesRef.current.isMobile ? 'mobile' : 'desktop'}):`, src);

    // Mobile audio context handling
    if (capabilitiesRef.current.isMobile && contextRef.current?.state === 'suspended') {
      contextRef.current.resume().catch((error) => {
        console.warn('Failed to resume audio context:', error);
      });
    }

    const pool = audioPoolRef.current[src];
    if (!pool || pool.length === 0) {
      // Fallback: create a single instance
      const audio = createAudioInstance(src);
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Silently handle play failures
        });
      }
      return;
    }

    // Find available instance or use least recently used
    let availableInstance = pool.find(instance => !instance.isPlaying);
    
    if (!availableInstance) {
      availableInstance = pool.reduce((oldest, current) => 
        current.lastUsed < oldest.lastUsed ? current : oldest
      );
      
      availableInstance.audio.pause();
      availableInstance.audio.currentTime = 0;
    }

    availableInstance.isPlaying = true;
    availableInstance.lastUsed = Date.now();

    const playPromise = availableInstance.audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('✅ Sound played successfully:', src);
        })
        .catch(() => {
          availableInstance!.isPlaying = false;
        });
    }

    // Reset playing state when audio ends
    availableInstance.audio.onended = () => {
      availableInstance!.isPlaying = false;
    };
  }, [isMuted, createAudioInstance]);

  // Cleanup
  useEffect(() => {
    return () => {
      Object.values(audioPoolRef.current).forEach(pool => {
        pool.forEach(instance => {
          instance.audio.pause();
          instance.audio.currentTime = 0;
          instance.audio.src = '';
        });
      });
      audioPoolRef.current = {};
      preloadedRef.current.clear();
      
      if (contextRef.current) {
        contextRef.current.close();
        contextRef.current = null;
      }
    };
  }, []);

  // Initialize audio context on first user interaction (mobile)
  useEffect(() => {
    if (!capabilitiesRef.current.isMobile) return;
    
    const handleFirstInteraction = () => {
      initializeAudioContext();
      
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [initializeAudioContext]);

  return {
    preloadSound,
    playSound,
    cleanup: () => {
      Object.values(audioPoolRef.current).forEach(pool => {
        pool.forEach(instance => {
          instance.audio.pause();
          instance.audio.src = '';
        });
      });
      audioPoolRef.current = {};
    }
  };
};

export default useUnifiedAudioManager; 