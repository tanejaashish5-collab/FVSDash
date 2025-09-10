import { useState, useEffect, useRef, RefObject } from 'react';

interface IntersectionObserverOptions {
    threshold?: number;
    root?: Element | null;
    rootMargin?: string;
    triggerOnce?: boolean;
}

const useIntersectionObserver = (
    elementRef: RefObject<Element>,
    {
        threshold = 0.1,
        root = null,
        rootMargin = '0%',
        triggerOnce = true
    }: IntersectionObserverOptions
): boolean => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        // Disconnect previous observer if it exists
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            ([entry]) => {
                const inView = entry.isIntersecting;
                if (inView) {
                    setIsIntersecting(true);
                    if (triggerOnce && observerRef.current) {
                        observerRef.current.unobserve(element);
                    }
                } else {
                    if (!triggerOnce) {
                        setIsIntersecting(false);
                    }
                }
            },
            { threshold, root, rootMargin }
        );

        observerRef.current.observe(element);

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [elementRef, threshold, root, rootMargin, triggerOnce]);

    return isIntersecting;
};

export default useIntersectionObserver;
