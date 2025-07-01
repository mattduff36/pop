import { useState, useCallback } from 'react';

interface PreloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  isComplete: boolean;
}

const useAssetPreloader = () => {
  const [progress, setProgress] = useState<PreloadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
    isComplete: false,
  });

  const preloadAssets = useCallback(async (): Promise<void> => {
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    
    // All card images + card back + sounds
    const cardImages = suits.flatMap(suit =>
      ranks.map(rank => `/cards/SVG-cards/${rank}_of_${suit}.svg`)
    );
    cardImages.push('/cards/SVG-cards/card_back3.svg');
    
    const soundFiles = [
      '/sounds/button-click.mp3',
      '/sounds/card-flip.mp3',
      '/sounds/correct-guess.mp3',
      '/sounds/game-start.mp3',
      '/sounds/incorrect-guess.mp3',
    ];

    const allAssets = [...cardImages, ...soundFiles];
    const totalAssets = allAssets.length;
    let loadedAssets = 0;

    setProgress({
      loaded: 0,
      total: totalAssets,
      percentage: 0,
      isComplete: false,
    });

    const updateProgress = () => {
      loadedAssets++;
      const percentage = Math.round((loadedAssets / totalAssets) * 100);
      setProgress({
        loaded: loadedAssets,
        total: totalAssets,
        percentage,
        isComplete: loadedAssets === totalAssets,
      });
    };

    // Preload images
    const imagePromises = cardImages.map(imagePath => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          updateProgress();
          resolve();
        };
        img.onerror = () => {
          // Still resolve on error to prevent hanging
          updateProgress();
          resolve();
        };
        img.src = imagePath;
      });
    });

    // Preload sounds
    const soundPromises = soundFiles.map(soundPath => {
      return new Promise<void>((resolve) => {
        const audio = new Audio();
        audio.addEventListener('canplaythrough', () => {
          updateProgress();
          resolve();
        });
        audio.addEventListener('error', () => {
          // Still resolve on error to prevent hanging
          updateProgress();
          resolve();
        });
        audio.preload = 'auto';
        audio.src = soundPath;
      });
    });

    // Wait for all assets to load
    await Promise.all([...imagePromises, ...soundPromises]);
  }, []);

  return { progress, preloadAssets };
};

export default useAssetPreloader; 