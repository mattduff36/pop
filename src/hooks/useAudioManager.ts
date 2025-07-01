import { useCallback, useEffect, useRef } from 'react';

interface AudioInstance {
  audio: HTMLAudioElement;
  isPlaying: boolean;
}

interface AudioPool {
  [key: string]: AudioInstance[];
}

const useAudioManager = (isMuted: boolean = false) => {
  const audioPoolRef = useRef<AudioPool>({});
  const preloadedRef = useRef<Set<string>>(new Set());

  // Preload and create audio pool for a sound
  const preloadSound = useCallback((soundUrl: string, poolSize: number = 3, volume: number = 1.0) => {
    if (typeof window === 'undefined' || preloadedRef.current.has(soundUrl)) {
      return;
    }

    console.log(`🔊 Preloading desktop audio: ${soundUrl}`);
    const audioPool: AudioInstance[] = [];
    
    for (let i = 0; i < poolSize; i++) {
      const audio = new Audio(soundUrl);
      audio.volume = volume;
      audio.preload = 'auto';
      
      const handleError = (e: Event) => {
        console.warn(`Desktop audio load error for ${soundUrl}:`, e);
      };
      
      const handleLoad = () => {
        console.log(`✅ Desktop audio loaded: ${soundUrl}`);
      };
      
      const handleEnded = () => {
        const instance = audioPool.find(inst => inst.audio === audio);
        if (instance) {
          instance.isPlaying = false;
        }
      };
      
      audio.addEventListener('error', handleError);
      audio.addEventListener('canplaythrough', handleLoad);
      audio.addEventListener('ended', handleEnded);
      
      audioPool.push({
        audio,
        isPlaying: false
      });
    }
    
    audioPoolRef.current[soundUrl] = audioPool;
    preloadedRef.current.add(soundUrl);
  }, []);

  // Play a sound from the pool
  const playSound = useCallback((soundUrl: string) => {
    if (isMuted) {
      console.log('🔇 Desktop sound muted:', soundUrl);
      return;
    }
    
    if (!audioPoolRef.current[soundUrl]) {
      console.warn('🔊 Desktop audio pool not found for:', soundUrl);
      return;
    }
    
    try {
      console.log('🔊 Playing desktop sound:', soundUrl);
      // Find an available audio instance
      const pool = audioPoolRef.current[soundUrl];
      const availableInstance = pool.find(instance => !instance.isPlaying);
      
      if (availableInstance) {
        availableInstance.isPlaying = true;
        availableInstance.audio.currentTime = 0;
        const playPromise = availableInstance.audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Desktop sound played successfully:', soundUrl);
            })
            .catch(error => {
              if (error.name !== 'NotAllowedError') {
                console.warn('Desktop sound play error:', error);
              }
              availableInstance.isPlaying = false;
            });
        }
      } else {
        console.warn('🔊 No available desktop audio instance for:', soundUrl);
      }
    } catch (error) {
      console.error('Desktop sound playback error:', error);
    }
  }, [isMuted]);



  // Cleanup function
  const cleanup = useCallback(() => {
    Object.values(audioPoolRef.current).forEach(pool => {
      pool.forEach(instance => {
        instance.audio.pause();
        instance.audio.src = '';
        instance.audio.removeEventListener('error', () => {});
        instance.audio.removeEventListener('ended', () => {});
      });
    });
    audioPoolRef.current = {};
    preloadedRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    preloadSound,
    playSound,
    cleanup
  };
};

export default useAudioManager; 