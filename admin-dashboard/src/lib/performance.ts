// Performance monitoring and optimization utilities

export const performanceMonitor = {
  // Track component render times
  measureRender: <T extends object>(
    Component: React.ComponentType<T>,
    componentName: string
  ) => {
    return React.memo((props: T) => {
      const renderStart = performance.now();
      
      React.useEffect(() => {
        const renderEnd = performance.now();
        const renderTime = renderEnd - renderStart;
        
        if (renderTime > 100) { // Log slow renders (>100ms)
          console.warn(`Slow render detected in ${componentName}:`, {
            renderTime: `${renderTime.toFixed(2)}ms`,
            props: process.env.NODE_ENV === 'development' ? props : '[hidden]'
          });
        }
      });

      return React.createElement(Component, props);
    });
  },

  // Debounce expensive operations
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle high-frequency events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Virtual scrolling helper for large lists
  useVirtualList: (items: any[], containerHeight: number, itemHeight: number) => {
    const [scrollTop, setScrollTop] = React.useState(0);
    
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    const visibleItems = items.slice(visibleStart, visibleEnd);
    const offsetY = visibleStart * itemHeight;
    
    return {
      visibleItems,
      offsetY,
      totalHeight: items.length * itemHeight,
      onScroll: (e: React.UIEvent<HTMLElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
      }
    };
  },

  // Bundle analysis helper
  analyzeBundle: () => {
    if (process.env.NODE_ENV === 'development') {
      // Track loaded modules
      const loadedModules = Object.keys(window as any);
      console.group('Bundle Analysis');
      console.log('Loaded modules count:', loadedModules.length);
      
      // Track memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log('Memory usage:', {
          used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
        });
      }
      console.groupEnd();
    }
  }
};

// Performance-aware React hooks
export const usePerformantState = <T>(initialValue: T, debounceMs = 300) => {
  const [value, setValue] = React.useState(initialValue);
  const [debouncedValue, setDebouncedValue] = React.useState(initialValue);

  const debouncedSetValue = React.useMemo(
    () => performanceMonitor.debounce(setDebouncedValue, debounceMs),
    [debounceMs]
  );

  React.useEffect(() => {
    debouncedSetValue(value);
  }, [value, debouncedSetValue]);

  return [debouncedValue, setValue] as const;
};

export const useIntersectionObserver = (
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, options]);

  return isIntersecting;
};

// Bundle splitting configuration
export const lazyLoad = (importFn: () => Promise<any>) => {
  return React.lazy(importFn);
};
