import { useState, useCallback } from 'react';

interface PreloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  isComplete: boolean;
}

// Detect mobile devices
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Detect iOS specifically
const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const useAssetPreloader = () => {
  const [progress, setProgress] = useState<PreloadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
    isComplete: false,
  });

  // Create a promise with timeout
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ]);
  };

  // Load assets in chunks for better mobile performance
  const loadAssetsInChunks = async (assets: string[], chunkSize: number, loadFunction: (asset: string) => Promise<void>) => {
    for (let i = 0; i < assets.length; i += chunkSize) {
      const chunk = assets.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(asset => loadFunction(asset));
      await Promise.all(chunkPromises);
      
      // Small delay between chunks on mobile to prevent overwhelming the browser
      if (isMobile() && i + chunkSize < assets.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

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
      '/sounds/game-win.mp3',
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

    // Mobile-optimized image loading
    const loadImage = (imagePath: string): Promise<void> => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        
        const cleanup = () => {
          img.onload = null;
          img.onerror = null;
        };
        
        img.onload = () => {
          cleanup();
          updateProgress();
          resolve();
        };
        
        img.onerror = () => {
          cleanup();
          console.warn(`Failed to load image: ${imagePath}`);
          updateProgress();
          resolve();
        };
        
        img.src = imagePath;
      });
    };

    // Mobile-optimized audio loading with timeout
    const loadAudio = (soundPath: string): Promise<void> => {
      return new Promise<void>((resolve) => {
        // On iOS, skip audio preloading to prevent hanging
        if (isIOS()) {
          console.log(`Skipping audio preload on iOS: ${soundPath}`);
          updateProgress();
          resolve();
          return;
        }

        const audio = new Audio();
        let resolved = false;
        
        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          audio.removeEventListener('canplaythrough', onLoad);
          audio.removeEventListener('loadeddata', onLoad);
          audio.removeEventListener('error', onError);
          audio.src = '';
        };
        
        const onLoad = () => {
          cleanup();
          updateProgress();
          resolve();
        };
        
        const onError = () => {
          cleanup();
          console.warn(`Failed to load audio: ${soundPath}`);
          updateProgress();
          resolve();
        };
        
        // Set up event listeners
        audio.addEventListener('canplaythrough', onLoad);
        audio.addEventListener('loadeddata', onLoad);
        audio.addEventListener('error', onError);
        
        // Mobile Safari timeout
        const timeoutMs = isMobile() ? 3000 : 10000;
        setTimeout(() => {
          if (!resolved) {
            cleanup();
            console.warn(`Audio load timeout: ${soundPath}`);
            updateProgress();
            resolve();
          }
        }, timeoutMs);
        
        audio.preload = 'metadata'; // Use 'metadata' instead of 'auto' on mobile
        audio.src = soundPath;
      });
    };

    try {
      // Mobile-optimized loading strategy
      if (isMobile()) {
        console.log('Mobile device detected - using optimized loading strategy');
        
        // Load images in smaller chunks on mobile
        await loadAssetsInChunks(cardImages, 8, (imagePath) => 
          withTimeout(loadImage(imagePath), 5000).catch(() => {
            console.warn(`Image load timeout: ${imagePath}`);
            updateProgress();
          })
        );
        
        // Load audio files one by one on mobile with longer timeouts
        for (const soundPath of soundFiles) {
          await loadAudio(soundPath);
          // Small delay between audio files on mobile
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else {
        // Desktop: Load all assets in parallel
        const imagePromises = cardImages.map(imagePath => 
          withTimeout(loadImage(imagePath), 10000).catch(() => {
            console.warn(`Image load timeout: ${imagePath}`);
            updateProgress();
          })
        );
        
        const soundPromises = soundFiles.map(soundPath => 
          withTimeout(loadAudio(soundPath), 15000).catch(() => {
            console.warn(`Audio load timeout: ${soundPath}`);
            updateProgress();
          })
        );
        
        await Promise.all([...imagePromises, ...soundPromises]);
      }
      
      console.log('Asset preloading completed');
    } catch (error) {
      console.error('Asset preloading error:', error);
      // Ensure progress shows complete even if there were errors
      setProgress({
        loaded: totalAssets,
        total: totalAssets,
        percentage: 100,
        isComplete: true,
      });
    }
  }, []);

  return { progress, preloadAssets };
};

export default useAssetPreloader; 