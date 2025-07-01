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
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
  // Estimate device performance based on various factors
  const memory = (navigator as any).deviceMemory || 4; // Default to 4GB if not available
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const connectionType = (navigator as any).connection?.effectiveType || '4g';
  
  // Detect specifically low-end devices with improved iPhone detection
  const isLowEnd = 
    memory <= 2 || 
    hardwareConcurrency <= 2 || 
    connectionType === 'slow-2g' || 
    connectionType === '2g' ||
    /iPhone [5-8]|iPad [1-6]|Android [4-7]/i.test(userAgent) ||
    // Additional iPhone optimization checks
    (isIOS && (memory <= 3 || hardwareConcurrency <= 4));

  const capabilities: DeviceCapabilities = {
    isMobile,
    isLowEnd,
    maxAnimationFPS: isLowEnd ? 30 : (isIOS ? 60 : isMobile ? 45 : 60), // iOS can handle 60fps better
    shouldReduceEffects: isLowEnd || (isMobile && !isIOS && memory <= 4), // iOS generally handles effects better
    audioQuality: isLowEnd ? 'low' : isMobile ? 'medium' : 'high',
    imageQuality: isLowEnd ? 'medium' : 'high',
    maxConcurrentAnimations: isLowEnd ? 2 : (isIOS ? 6 : isMobile ? 4 : 8) // iOS can handle more concurrent animations
  };

  // Debug logging for mobile devices
  if (isMobile) {
    console.log('📱 Device Capabilities:', {
      userAgent,
      memory,
      hardwareConcurrency,
      connectionType,
      capabilities
    });
  }

  return capabilities;
};

// Get performance settings based on device capabilities
export const getPerformanceSettings = (capabilities: DeviceCapabilities): PerformanceSettings => {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
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

  // iOS-specific optimizations
  if (isIOS) {
    return {
      animationDuration: {
        card: 300, // Slightly faster for iOS
        heart: 800,
        title: 300
      },
      particleCount: {
        hearts: capabilities.shouldReduceEffects ? 2 : 4
      },
      audioSettings: {
        poolSize: 3, // iOS can handle more audio instances
        preloadAll: false // iOS handles on-demand loading better
      },
      renderSettings: {
        willChange: true,
        transform3d: true // iOS handles 3D transforms very well
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