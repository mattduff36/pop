import { useCallback, useEffect, useRef } from 'react';

const useSound = (soundUrl: string, volume: number = 1.0, isMuted: boolean = false) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const audio = new Audio(soundUrl);
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleError = (e: Event) => {
        console.error(`Error loading audio source: ${soundUrl}`, e);
    };

    audio.addEventListener('error', handleError);

    return () => {
      if (audio) {
        audio.removeEventListener('error', handleError);
        audio.pause();
        audio.src = '';
      }
    };
  }, [soundUrl, volume]);

  const playSound = useCallback(() => {
    if (isMuted || !audioRef.current) {
      return;
    }
    
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(error => {
      if (error.name !== 'NotAllowedError') {
        console.error('Error playing sound:', error);
      }
    });
  }, [isMuted]);

  return playSound;
};

export default useSound; 