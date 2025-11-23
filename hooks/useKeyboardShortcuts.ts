
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
            
            // Construct binding string
            // We prefer code for layout independence, but check key for special ones
            let binding = code;
            
            // Special Handling for Backspace/Delete
            if (code === 'Backspace' || key === 'Backspace') binding = 'Backspace';
            if (code === 'Delete' || key === 'Delete') binding = 'Delete'; // Forward delete usually
            if (code === 'Escape' || key === 'Escape') binding = 'Escape';
            if (code === 'ArrowUp' || key === 'ArrowUp') binding = 'ArrowUp';
            if (code === 'ArrowDown' || key === 'ArrowDown') binding = 'ArrowDown';
            if (code === 'ArrowLeft' || key === 'ArrowLeft') binding = 'ArrowLeft';
            if (code === 'ArrowRight' || key === 'ArrowRight') binding = 'ArrowRight';

            // Handle modifiers for "Ctrl+Key" format or simple keys
            // Modifiers shouldn't be applied to the base binding if it was already forced to a special key above?
            // No, user might want Ctrl+Backspace.
            
            // Reset binding if it's just a character to use code
            if (!['Backspace', 'Delete', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(binding)) {
                binding = code;
            }

            if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) binding = `Ctrl+${binding}`;
            if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) binding = `Shift+${binding}`;
            
            // Number keys often come as Digit1, Digit2 - Normalize for simple binding if needed
            // But we use codes like 'Digit1' in defaults.
            
            // Handle NumPad vs Digit
            // If binding is Numpad1, user might expect Digit1 behavior if bound?
            // For now, stick to strict code mapping unless it matches setting.

            // Find action
            let entry = Object.entries(settings.shortcuts).find(([_, bind]) => bind === binding);
            
            // Fallback: If not found, and binding was modifier+key, try simpler? No.
            
            if (entry) {
                e.preventDefault();
                onAction(entry[0] as ShortcutAction);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [settings.shortcuts, onAction]);
};