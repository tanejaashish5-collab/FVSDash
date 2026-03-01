/**
 * ShortcutsModal — shows a keyboard shortcut reference.
 * Triggered by pressing '?' anywhere in the app (when not in an input).
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const SHORTCUT_GROUPS = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['G', 'O'], desc: 'Go to Overview' },
      { keys: ['G', 'P'], desc: 'Go to Pipeline' },
      { keys: ['G', 'S'], desc: 'Go to Content Studio' },
      { keys: ['G', 'V'], desc: 'Go to Video Editor' },
      { keys: ['G', 'A'], desc: 'Go to Analytics' },
    ],
  },
  {
    label: 'Pipeline',
    shortcuts: [
      { keys: ['N'], desc: 'New submission' },
      { keys: ['/'], desc: 'Focus search' },
      { keys: ['J'], desc: 'Next submission' },
      { keys: ['K'], desc: 'Previous submission' },
      { keys: ['Enter'], desc: 'Open selected submission' },
      { keys: ['Esc'], desc: 'Close panel / deselect' },
    ],
  },
  {
    label: 'Status (with submission selected)',
    shortcuts: [
      { keys: ['1'], desc: 'Move to INTAKE' },
      { keys: ['2'], desc: 'Move to EDITING' },
      { keys: ['3'], desc: 'Move to DESIGN' },
      { keys: ['4'], desc: 'Move to SCHEDULED' },
      { keys: ['5'], desc: 'Move to PUBLISHED' },
    ],
  },
  {
    label: 'General',
    shortcuts: [
      { keys: ['?'], desc: 'Show this help' },
      { keys: ['Esc'], desc: 'Close dialogs' },
    ],
  },
];

function KeyBadge({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[22px] h-5 rounded text-[10px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-300 leading-none">
      {children}
    </kbd>
  );
}

export function ShortcutsModal({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-zinc-800">
          <DialogTitle className="text-sm font-semibold text-zinc-100">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4 grid grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{group.label}</p>
              <div className="space-y-1.5">
                {group.shortcuts.map((sc) => (
                  <div key={sc.desc} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400">{sc.desc}</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {sc.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                          {i > 0 && <span className="text-zinc-600 text-[9px] mx-0.5">then</span>}
                          <KeyBadge>{k}</KeyBadge>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-zinc-800 text-[10px] text-zinc-600">
          Shortcuts are disabled when typing in form fields.
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * useShortcutsModal — convenience hook that manages the modal open/close state
 * and registers the '?' key globally.
 */
export function useShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      const target = e.target;
      const ignoredTags = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
      if (ignoredTags.has(target?.tagName) || target?.contentEditable === 'true') return;
      if (e.key === '?') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return { open, setOpen };
}

export default ShortcutsModal;
