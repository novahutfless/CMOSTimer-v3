
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
            
            // Construct binding string
            let binding = code;
            
            // Handle modifiers for "Ctrl+Key" format or simple keys
            if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) binding = `Ctrl+${code}`;
            if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) binding = `Shift+${code}`;
            
            // Number keys often come as Digit1, Digit2
            if (code.startsWith('Digit')) binding = code;
            if (e.shiftKey && code.startsWith('Digit')) binding = `Shift+${code}`;
            if (e.ctrlKey && code.startsWith('Digit')) binding = `Ctrl+${code}`;

            // Special keys
            if (code === 'Backspace') binding = 'Backspace';
            if (code === 'Escape') binding = 'Escape';
            if (code === 'ArrowUp') binding = 'ArrowUp';
            if (code === 'ArrowDown') binding = 'ArrowDown';

            // Find action
            const entry = Object.entries(settings.shortcuts).find(([_, bind]) => bind === binding);
            if (entry) {
                e.preventDefault();
                onAction(entry[0] as ShortcutAction);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [settings.shortcuts, onAction]);
};
