import { useState, useEffect } from 'react';

// Breakpoints matching Tailwind CSS
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof breakpoints;

export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState<{
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLandscape: boolean;
    currentBreakpoint: Breakpoint | 'xs';
  }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLandscape: false,
    currentBreakpoint: 'lg',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscape = width > height;

      let currentBreakpoint: Breakpoint | 'xs' = 'xs';
      if (width >= breakpoints['2xl']) currentBreakpoint = '2xl';
      else if (width >= breakpoints.xl) currentBreakpoint = 'xl';
      else if (width >= breakpoints.lg) currentBreakpoint = 'lg';
      else if (width >= breakpoints.md) currentBreakpoint = 'md';
      else if (width >= breakpoints.sm) currentBreakpoint = 'sm';

      const isMobile = width < breakpoints.md;
      const isTablet = width >= breakpoints.sm && width < breakpoints.lg;
      const isDesktop = width >= breakpoints.lg;

      setScreenSize({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        isLandscape,
        currentBreakpoint,
      });
    };

    // Initial calculation
    updateScreenSize();

    // Throttled resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScreenSize, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', updateScreenSize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateScreenSize);
      clearTimeout(timeoutId);
    };
  }, []);

  return screenSize;
};

// Hook for media queries
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

// Hook for detecting touch devices
export const useTouch = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasTouch = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 ||
                     // @ts-ignore
                     navigator.msMaxTouchPoints > 0;

    setIsTouch(hasTouch);
  }, []);

  return isTouch;
};

// Hook for detecting device capabilities
export const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    hasHover: false,
    hasPointer: false,
    isHighDPI: false,
    prefersReducedMotion: false,
    isDarkMode: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasHover = window.matchMedia('(hover: hover)').matches;
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    const isHighDPI = window.matchMedia('(-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    setCapabilities({
      hasHover,
      hasPointer,
      isHighDPI,
      prefersReducedMotion,
      isDarkMode,
    });

    // Listen for changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setCapabilities(prev => ({ ...prev, isDarkMode: e.matches }));
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setCapabilities(prev => ({ ...prev, prefersReducedMotion: e.matches }));
    };

    darkModeQuery.addEventListener('change', handleDarkModeChange);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return capabilities;
};

// Utility functions for responsive design
export const responsive = {
  isMobile: (width: number) => width < breakpoints.md,
  isTablet: (width: number) => width >= breakpoints.sm && width < breakpoints.lg,
  isDesktop: (width: number) => width >= breakpoints.lg,
  
  // Get appropriate grid columns based on screen size
  getGridColumns: (width: number) => {
    if (width < breakpoints.sm) return 1;
    if (width < breakpoints.md) return 2;
    if (width < breakpoints.lg) return 3;
    return 4;
  },
  
  // Get appropriate font size
  getFontSize: (width: number, baseSize = 16) => {
    if (width < breakpoints.sm) return Math.max(14, baseSize - 2);
    if (width < breakpoints.md) return Math.max(15, baseSize - 1);
    return baseSize;
  },
  
  // Get appropriate spacing
  getSpacing: (width: number, baseSpacing = 16) => {
    if (width < breakpoints.sm) return Math.max(8, baseSpacing - 8);
    if (width < breakpoints.md) return Math.max(12, baseSpacing - 4);
    return baseSpacing;
  },
  
  // Get appropriate component size
  getComponentSize: (width: number): 'sm' | 'md' | 'lg' => {
    if (width < breakpoints.sm) return 'sm';
    if (width < breakpoints.lg) return 'md';
    return 'lg';
  },
  
  // Check if should use mobile layout
  shouldUseMobileLayout: (width: number, height?: number) => {
    const isMobileWidth = width < breakpoints.md;
    const isLandscapePhone = height && width > height && width < breakpoints.lg;
    return isMobileWidth || isLandscapePhone;
  },
};

// Custom hook for adaptive loading delays
export const useAdaptiveLoading = () => {
  const { isMobile, currentBreakpoint } = useResponsive();
  
  // Longer delays on mobile for perceived performance
  const getLoadingDelay = (baseDelay = 200) => {
    if (isMobile) return baseDelay + 100;
    if (currentBreakpoint === 'sm') return baseDelay + 50;
    return baseDelay;
  };
  
  // Staggered loading for multiple items
  const getStaggeredDelay = (index: number, baseDelay = 100) => {
    const delay = getLoadingDelay(baseDelay);
    return delay + (index * (isMobile ? 75 : 50));
  };
  
  return { getLoadingDelay, getStaggeredDelay };
};