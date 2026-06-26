import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountUpOptions {
  to: number;
  duration?: number;
  easing?: 'easeOut' | 'linear';
}

export function useCountUp({ to, duration = 1200, easing = 'easeOut' }: UseCountUpOptions) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const animationFrame = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // FIX: Memoize the animation function to prevent recreation on every render
  const animateCount = useCallback(() => {
    const step = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      
      let easedProgress: number;
      if (easing === 'easeOut') {
        // Easing function (cubic-bezier(0.19, 1, 0.22, 1) is 'easeOutExpo', but a simpler cubic for numbers)
        easedProgress = 1 - Math.pow(1 - progress, 3);
      } else {
        easedProgress = progress;
      }
      
      setCount(Math.floor(easedProgress * to));

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(step);
      } else {
        setCount(to); // Ensure final value is exact
      }
    };
    animationFrame.current = requestAnimationFrame(step);
  }, [to, duration, easing]);

  useEffect(() => {
    // FIX: Properly clean up previous observer before creating new one
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startTime.current = null; // Reset start time for re-animation
          animateCount();
        } else {
          if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
            animationFrame.current = null;
          }
          setCount(0); // Reset count when out of view
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the component is visible
    );

    observerRef.current = observer;

    if (ref.current) {
      observer.observe(ref.current);
    }

    // FIX: Proper cleanup function that handles all resources
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
    };
  }, [animateCount]); // FIX: Add animateCount to dependencies

  const formattedCount = count.toLocaleString('ar-EG');

  return { count: formattedCount, ref };
}
