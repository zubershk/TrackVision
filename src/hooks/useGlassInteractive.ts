import { useRef, useCallback, useEffect } from 'react';

interface RippleOptions {
  duration?: number;
  scale?: number;
}

interface GlassInteractiveProps {
  ref: React.RefObject<HTMLElement>;
  onPointerDown: (e: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  tabIndex?: number;
  role?: string;
}

/**
 * Hook for Liquid Glass interactive effects
 * Provides ripple effect on click/touch for glass elements
 */
export function useGlassInteractive(options: RippleOptions = {}): Omit<GlassInteractiveProps, 'ref'> & { ref: React.RefObject<HTMLElement | null> } {
  const { duration = 400, scale = 2.5 } = options;
  const elementRef = useRef<HTMLElement>(null);
  const rippleRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    const el = elementRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    rippleRef.current = { x, y, active: true };
    el.style.setProperty('--ripple-x', `${x}px`);
    el.style.setProperty('--ripple-y', `${y}px`);
    el.classList.add('ripple-active');

    // Clean up after animation
    setTimeout(() => {
      el.classList.remove('ripple-active');
      rippleRef.current.active = false;
    }, 400);
  }, []);

  const handlePointerUp = useCallback(() => {
    const el = elementRef.current;
    if (el) {
      el.classList.remove('ripple-active');
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    const el = elementRef.current;
    if (el) {
      el.classList.remove('ripple-active');
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const target = e.currentTarget;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      target.click();
    }
    
    if (e.key === 'Escape') {
      target.blur();
    }
  }, []);

  // Apply ripple styles to element
  useEffect(() => {
    const el = elementRef.current;
    if (el) {
      el.style.setProperty('--ripple-duration', '400ms');
      el.style.setProperty('--ripple-scale', scale.toString());
    }
  }, [scale]);

  return {
    ref: elementRef,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
    onMouseDown: handlePointerDown,
    onMouseUp: handlePointerUp,
    onMouseLeave: handlePointerLeave,
    onTouchStart: handlePointerDown,
    onTouchEnd: handlePointerUp,
    onTouchCancel: handlePointerLeave,
    onKeyDown: handleKeyDown,
    tabIndex: 0,
    role: 'button',
  };
}

/**
 * Hook for glass morphing animation between elements
 * Used in glass containers to coordinate morphing
 */
export function useGlassMorph(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const glassElements = container.querySelectorAll('.glass, .glass-strong, .glass-subtle');
    if (glassElements.length < 2) return;

    // Observe element positions for morphing
    const observer = new ResizeObserver(() => {
      glassElements.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        const nextEl = glassElements[index + 1] as HTMLElement;
        
        if (nextEl) {
          const rect1 = htmlEl.getBoundingClientRect();
          const rect2 = nextEl.getBoundingClientRect();
          const gap = rect2.left - rect1.right;
          
          // If elements are close, apply morphing class
          if (gap < 24 && gap > 0) {
            htmlEl.classList.add('glass-morphing');
            nextEl.classList.add('glass-morphing');
          } else {
            htmlEl.classList.remove('glass-morphing');
            nextEl.classList.remove('glass-morphing');
          }
        }
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);
}