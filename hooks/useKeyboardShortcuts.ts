
import { useEffect } from 'react';
import { ShortcutAction, Settings } from '../types';

type ActionHandler = (action: ShortcutAction) => void;

export const useKeyboardShortcuts = (
    settings: Settings,
    onAction: ActionHandler
) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore inputs
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                return;
            }

            const code = e.code;
            const key = e.key;
            
            const getBindingForCode = (c: string) => {
                let binding = c;
                // Special Handling for Backspace/Delete/Arrows to support both Code and Key matching logic legacy
                if (c === 'Backspace' || key === 'Backspace') binding = 'Backspace';
                if (c === 'Delete' || key === 'Delete') binding = 'Delete'; 
                if (c === 'Escape' || key === 'Escape') binding = 'Escape';
                if (c === 'ArrowUp' || key === 'ArrowUp') binding = 'ArrowUp';
                if (c === 'ArrowDown' || key === 'ArrowDown') binding = 'ArrowDown';
                if (c === 'ArrowLeft' || key === 'ArrowLeft') binding = 'ArrowLeft';
                if (c === 'ArrowRight' || key === 'ArrowRight') binding = 'ArrowRight';

                // Reset binding if it's just a character to use code (default behavior)
                if (!['Backspace', 'Delete', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(binding)) {
                    binding = c;
                }

                if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) binding = `Ctrl+${binding}`;
                if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) binding = `Shift+${binding}`;
                
                return binding;
            };

            // 1. Try Exact Match (e.g. Digit1 or Numpad1 if explicitly bound)
            const primaryBinding = getBindingForCode(code);
            let entry = Object.entries(settings.shortcuts).find(([_, bind]) => bind === primaryBinding);
            
            // 2. Numpad Fallback (e.g. Numpad1 triggers Digit1 binding)
            if (!entry && code.startsWith('Numpad')) {
                const digitCode = code.replace('Numpad', 'Digit');
                // Only proceed if it actually looks like a Digit key (e.g. Digit1) to avoid NumpadEnter -> DigitEnter weirdness
                if (digitCode !== code) {
                    const altBinding = getBindingForCode(digitCode);
                    entry = Object.entries(settings.shortcuts).find(([_, bind]) => bind === altBinding);
                }
            }
            
            if (entry) {
                e.preventDefault();
                onAction(entry[0] as ShortcutAction);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [settings.shortcuts, onAction]);
};
