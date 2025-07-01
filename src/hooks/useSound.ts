import { useCallback, useEffect, useRef } from 'react';

const useSound = (soundUrl: string, volume: number = 1.0, isMuted: boolean = false) => {
  const audioPoolRef = useRef<HTMLAudioElement[]>([]);
  const currentIndexRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Create a pool of 3 audio instances for better overlap handling
    const audioPool: HTMLAudioElement[] = [];
    for (let i = 0; i < 3; i++) {
      const audio = new Audio(soundUrl);
      audio.volume = volume;
      audio.preload = 'auto';
      
      const handleError = (e: Event) => {
        console.error(`Error loading audio source: ${soundUrl}`, e);
      };
      
      audio.addEventListener('error', handleError);
      audioPool.push(audio);
    }
    
    audioPoolRef.current = audioPool;

    return () => {
      audioPool.forEach(audio => {
        audio.removeEventListener('error', () => {});
        audio.pause();
        audio.src = '';
      });
    };
  }, [soundUrl, volume]);

  const playSound = useCallback(() => {
    if (isMuted || audioPoolRef.current.length === 0) {
      return;
    }
    
    try {
      // Get the next available audio instance from the pool
      const audio = audioPoolRef.current[currentIndexRef.current];
      currentIndexRef.current = (currentIndexRef.current + 1) % audioPoolRef.current.length;
      
      // Reset the audio to beginning and play
      audio.currentTime = 0;
      audio.play().catch(error => {
        if (error.name !== 'NotAllowedError') {
          console.error('Error playing sound:', error);
        }
      });
    } catch (error) {
      console.error('Sound playback error:', error);
    }
  }, [isMuted]);

  return playSound;
};

export default useSound; 