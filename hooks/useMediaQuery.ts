import { useState, useEffect } from 'react';

const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mediaQueryList = window.matchMedia(query);
        const documentChangeHandler = () => setMatches(mediaQueryList.matches);
        
        // Initial check
        setMatches(mediaQueryList.matches);

        // Listen for changes
        try {
            // Chrome, Firefox, etc.
            mediaQueryList.addEventListener('change', documentChangeHandler);
        } catch (e) {
            // Safari < 14 fallback
            mediaQueryList.addListener(documentChangeHandler);
        }

        return () => {
            try {
                mediaQueryList.removeEventListener('change', documentChangeHandler);
            } catch (e) {
                // Safari < 14 fallback
                mediaQueryList.removeListener(documentChangeHandler);
            }
        };
    }, [query]);

    return matches;
};

export default useMediaQuery;
