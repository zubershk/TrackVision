import { useEffect, useRef } from 'react';

/**
 * Hook to apply dynamic mouse spotlight lighting to child glass cards.
 * Updates CSS custom properties `--mouse-x` and `--mouse-y` on hovered cards.
 */
export function useSpotlightEffect<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const cards = container.querySelectorAll<HTMLElement>('.glass-card, .glass-panel, .spotlight-card');
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return containerRef;
}
