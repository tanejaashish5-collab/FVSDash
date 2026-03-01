/**
 * useKeyboardShortcuts — registers keyboard shortcut handlers globally.
 *
 * Usage:
 *   useKeyboardShortcuts({
 *     'n': () => openNewSubmission(),
 *     '/': () => focusSearch(),
 *     'g o': () => navigate('/dashboard/overview'),  // chord shortcut
 *   });
 *
 * Shortcuts are ignored when the user is typing in an input, textarea, or
 * contenteditable element, so they don't interfere with form input.
 */
import { useEffect, useRef } from 'react';

const IGNORED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function useKeyboardShortcuts(shortcuts = {}, enabled = true) {
  // Chord state: if user pressed a "prefix" key (e.g. 'g'), wait for the next key
  const chordRef = useRef(null);
  const chordTimerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Skip when typing in form elements
      const target = e.target;
      if (
        IGNORED_TAGS.has(target.tagName) ||
        target.contentEditable === 'true' ||
        target.isContentEditable
      ) {
        return;
      }
      // Skip modifier-key combos (Ctrl, Alt, Meta) — let browser handle them
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key.toLowerCase();

      // Check if we're completing a chord (e.g. "g" then "o")
      if (chordRef.current) {
        const chord = `${chordRef.current} ${key}`;
        clearTimeout(chordTimerRef.current);
        chordRef.current = null;
        if (shortcuts[chord]) {
          e.preventDefault();
          shortcuts[chord](e);
          return;
        }
      }

      // Check for chord prefix (single key that has chord continuations)
      const hasChordContinuation = Object.keys(shortcuts).some(
        (sc) => sc.includes(' ') && sc.startsWith(key + ' ')
      );
      if (hasChordContinuation) {
        e.preventDefault();
        chordRef.current = key;
        // Reset chord state after 1 second if no continuation comes
        chordTimerRef.current = setTimeout(() => {
          chordRef.current = null;
        }, 1000);
        return;
      }

      // Direct single-key shortcut
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key](e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(chordTimerRef.current);
    };
  }, [shortcuts, enabled]);
}

export default useKeyboardShortcuts;
