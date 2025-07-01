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

export const useMobileAudioManager = (isMuted: boolean) => {
  const audioPoolRef = useRef<AudioPool>({});
  const capabilitiesRef = useRef(detectDeviceCapabilities());
  const settingsRef = useRef(getPerformanceSettings(capabilitiesRef.current));
  const contextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize Web Audio Context for better mobile performance
  const initializeAudioContext = useCallback(() => {
    if (isInitializedRef.current) return;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        contextRef.current = new AudioContext();
        isInitializedRef.current = true;
        console.log('Mobile audio context initialized:', contextRef.current.state);
      }
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
    }
  }, []);

  // Create optimized audio instances based on device capabilities
  const createAudioInstance = useCallback((src: string, volume: number = 1): HTMLAudioElement => {
    const audio = new Audio();
    
    // Mobile-specific optimizations
    if (capabilitiesRef.current.isMobile) {
      audio.preload = 'metadata'; // Reduce memory usage
      (audio as any).playsInline = true; // Prevent fullscreen on iOS
    } else {
      audio.preload = 'auto';
    }
    
    audio.src = src;
    audio.volume = volume;
    
    // Error handling for mobile networks
    audio.addEventListener('error', () => {
      console.warn(`Audio failed to load: ${src}`);
    });

    // Timeout for mobile loading issues
    const timeoutMs = capabilitiesRef.current.isMobile ? 3000 : 10000;
    setTimeout(() => {
      if (audio.readyState === 0) {
        console.warn(`Audio load timeout: ${src}`);
      }
    }, timeoutMs);

    return audio;
  }, []);

  // Preload audio with mobile-optimized strategy
  const preloadSound = useCallback(async (src: string, poolSize?: number, volume: number = 1) => {
    const settings = settingsRef.current;
    const actualPoolSize = poolSize || settings.audioSettings.poolSize;
    
    // Skip preloading on low-end devices if disabled
    if (!settings.audioSettings.preloadAll && capabilitiesRef.current.isLowEnd) {
      return;
    }

    if (!audioPoolRef.current[src]) {
      audioPoolRef.current[src] = [];
    }

    // Progressive loading for mobile
    if (capabilitiesRef.current.isMobile) {
      // Load one at a time to avoid overwhelming mobile browsers
      for (let i = 0; i < actualPoolSize; i++) {
        const audio = createAudioInstance(src, volume);
        audioPoolRef.current[src].push({
          audio,
          isPlaying: false,
          lastUsed: 0
        });
        
        // Small delay between loading each instance on mobile
        if (i < actualPoolSize - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } else {
      // Desktop can handle parallel loading
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
  }, [createAudioInstance]);

  // Play sound with mobile optimizations
  const playSound = useCallback((src: string) => {
    if (isMuted) {
      console.log('🔇 Sound muted:', src);
      return;
    }

    console.log('🔊 Playing sound:', src, 'Context state:', contextRef.current?.state);

    // Initialize audio context on first user interaction (mobile requirement)
    if (contextRef.current?.state === 'suspended') {
      console.log('🔊 Resuming suspended audio context');
      contextRef.current.resume();
    }

    const pool = audioPoolRef.current[src];
    if (!pool || pool.length === 0) {
      // Fallback: create a single instance if pool doesn't exist
      const audio = createAudioInstance(src);
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Silently handle play failures on mobile
        });
      }
      return;
    }

    // Find available instance or use least recently used
    let availableInstance = pool.find(instance => !instance.isPlaying);
    
    if (!availableInstance) {
      // All instances are playing, find the oldest one
      availableInstance = pool.reduce((oldest, current) => 
        current.lastUsed < oldest.lastUsed ? current : oldest
      );
      
      // Stop the old audio if it's still playing
      availableInstance.audio.pause();
      availableInstance.audio.currentTime = 0;
    }

    availableInstance.isPlaying = true;
    availableInstance.lastUsed = Date.now();

    const playPromise = availableInstance.audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Successfully started playing
        })
        .catch(() => {
          // Handle play failure (common on mobile)
          availableInstance!.isPlaying = false;
        });
    }

    // Reset playing state when audio ends
    availableInstance.audio.onended = () => {
      availableInstance!.isPlaying = false;
    };
  }, [isMuted, createAudioInstance]);

  // Cleanup and memory management
  useEffect(() => {
    return () => {
      // Clean up all audio instances
      Object.values(audioPoolRef.current).forEach(pool => {
        pool.forEach(instance => {
          instance.audio.pause();
          instance.audio.src = '';
          instance.audio.load(); // Free memory
        });
      });
      
      if (contextRef.current) {
        contextRef.current.close();
      }
    };
  }, []);

  // Initialize audio context on component mount
  useEffect(() => {
    // Wait for user interaction before initializing (mobile requirement)
    const handleFirstInteraction = () => {
      initializeAudioContext();
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('touchstart', handleFirstInteraction, { once: true });
    document.addEventListener('click', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, [initializeAudioContext]);

  return {
    playSound,
    preloadSound,
    capabilities: capabilitiesRef.current,
    settings: settingsRef.current
  };
}; 