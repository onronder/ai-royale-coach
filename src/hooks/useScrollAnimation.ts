import { useEffect, useRef, useState, useCallback } from 'react';

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
  staggerDelay?: number;
  staggerIndex?: number;
}

interface ScrollAnimationResult {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
  hasAnimated: boolean;
  animationDelay: number;
}

export function useScrollAnimation(options: ScrollAnimationOptions = {}): ScrollAnimationResult {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
    delay = 0,
    staggerDelay = 0,
    staggerIndex = 0,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const animationDelay = delay + (staggerDelay * staggerIndex);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (animationDelay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              setHasAnimated(true);
            }, animationDelay);
          } else {
            setIsVisible(true);
            setHasAnimated(true);
          }
          
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [threshold, rootMargin, triggerOnce, animationDelay]);

  return { ref: elementRef, isVisible, hasAnimated, animationDelay };
}

// Hook for animating multiple items with stagger
export function useStaggeredAnimation(
  itemCount: number,
  options: Omit<ScrollAnimationOptions, 'staggerIndex'> = {}
) {
  const { staggerDelay = 100, ...restOptions } = options;
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-stagger-index') || '0');
            setTimeout(() => {
              setVisibleItems(prev => new Set([...prev, index]));
            }, index * staggerDelay);
          }
        });
      },
      { threshold: options.threshold || 0.1, rootMargin: options.rootMargin || '50px' }
    );

    const items = containerRef.current?.querySelectorAll('[data-stagger-index]');
    items?.forEach(item => observer.observe(item));

    return () => observer.disconnect();
  }, [itemCount, staggerDelay, options.threshold, options.rootMargin]);

  const isItemVisible = useCallback((index: number) => visibleItems.has(index), [visibleItems]);
  const getItemDelay = useCallback((index: number) => index * staggerDelay, [staggerDelay]);

  return { containerRef, isItemVisible, getItemDelay, visibleItems };
}
