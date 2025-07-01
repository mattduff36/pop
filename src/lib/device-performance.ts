export interface DeviceCapabilities {
  isMobile: boolean;
  isLowEnd: boolean;
  maxAnimationFPS: number;
  shouldReduceEffects: boolean;
  audioQuality: 'high' | 'medium' | 'low';
  imageQuality: 'high' | 'medium' | 'low';
  maxConcurrentAnimations: number;
}

export interface PerformanceSettings {
  animationDuration: {
    card: number;
    heart: number;
    title: number;
  };
  particleCount: {
    hearts: number;
  };
  audioSettings: {
    poolSize: number;
    preloadAll: boolean;
  };
  renderSettings: {
    willChange: boolean;
    transform3d: boolean;
  };
}

// Detect device capabilities
export const detectDeviceCapabilities = (): DeviceCapabilities => {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Estimate device performance based on various factors
  const memory = (navigator as any).deviceMemory || 4; // Default to 4GB if not available
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const connectionType = (navigator as any).connection?.effectiveType || '4g';
  
  // Detect specifically low-end devices
  const isLowEnd = 
    memory <= 2 || 
    hardwareConcurrency <= 2 || 
    connectionType === 'slow-2g' || 
    connectionType === '2g' ||
    /iPhone [5-8]|iPad [1-6]|Android [4-7]/i.test(userAgent);

  return {
    isMobile,
    isLowEnd,
    maxAnimationFPS: isLowEnd ? 30 : isMobile ? 45 : 60,
    shouldReduceEffects: isLowEnd || (isMobile && memory <= 4),
    audioQuality: isLowEnd ? 'low' : isMobile ? 'medium' : 'high',
    imageQuality: isLowEnd ? 'medium' : 'high',
    maxConcurrentAnimations: isLowEnd ? 2 : isMobile ? 4 : 8
  };
};

// Get performance settings based on device capabilities
export const getPerformanceSettings = (capabilities: DeviceCapabilities): PerformanceSettings => {
  const baseSettings: PerformanceSettings = {
    animationDuration: {
      card: 400,
      heart: 1000,
      title: 400
    },
    particleCount: {
      hearts: 4
    },
    audioSettings: {
      poolSize: 3,
      preloadAll: true
    },
    renderSettings: {
      willChange: true,
      transform3d: true
    }
  };

  if (capabilities.isLowEnd) {
    return {
      animationDuration: {
        card: 300,
        heart: 800,
        title: 300
      },
      particleCount: {
        hearts: 2
      },
      audioSettings: {
        poolSize: 2,
        preloadAll: false
      },
      renderSettings: {
        willChange: false,
        transform3d: true
      }
    };
  }

  if (capabilities.isMobile) {
    return {
      animationDuration: {
        card: 350,
        heart: 900,
        title: 350
      },
      particleCount: {
        hearts: 3
      },
      audioSettings: {
        poolSize: 2,
        preloadAll: true
      },
      renderSettings: {
        willChange: true,
        transform3d: true
      }
    };
  }

  return baseSettings;
};

// Performance monitoring
export const createPerformanceMonitor = () => {
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;

  const measureFPS = () => {
    const now = performance.now();
    frameCount++;
    
    if (now - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (now - lastTime));
      frameCount = 0;
      lastTime = now;
    }
    
    requestAnimationFrame(measureFPS);
  };

  // Start monitoring
  requestAnimationFrame(measureFPS);

  return {
    getCurrentFPS: () => fps,
    isPerformancePoor: () => fps < 30
  };
}; 