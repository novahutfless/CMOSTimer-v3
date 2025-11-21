
import React, { useState, useEffect, useRef } from 'react';
import { TimePrecision } from '../types';

interface Props {
    onConfirm: (ms: number) => void;
    onCancel: () => void;
    precision: TimePrecision;
}

export const ManualEntry: React.FC<Props> = ({ onConfirm, onCancel, precision }) => {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.value = ''; // Ensure start empty
        }
    }, []);

    const getMultiplier = () => {
        switch (precision) {
            case TimePrecision.SECONDS: return 1000;
            case TimePrecision.DECI: return 100;
            case TimePrecision.CENTI: return 10;
            case TimePrecision.MILLI: return 1;
            default: return 10; // Default to centi logic
        }
    };

    const getFormatted = (raw: string) => {
        if (!raw) return '0';
        const val = parseInt(raw);
        if (isNaN(val)) return '0';

        // Display logic based on precision
        let fractionDigits = 0;
        switch (precision) {
            case TimePrecision.MILLI: fractionDigits = 3; break;
            case TimePrecision.CENTI: fractionDigits = 2; break;
            case TimePrecision.DECI: fractionDigits = 1; break;
            case TimePrecision.SECONDS: fractionDigits = 0; break;
        }

        if (fractionDigits === 0) return val.toString();

        const factor = Math.pow(10, fractionDigits);
        const sec = Math.floor(val / factor);
        const frac = val % factor;
        return `${sec}.${frac.toString().padStart(fractionDigits, '0')}`;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const val = parseInt(input);
            if (!isNaN(val) && val > 0) {
                const multiplier = getMultiplier();
                // Input represents the lowest unit of the precision
                // e.g. Precision Centi, input 123 -> 1.23s. Stored as ms: 123 * 10 = 1230ms
                onConfirm(val * multiplier);
            } else if (input === '' || val === 0) {
                // Treat empty or 0 as cancel usually, or just ignore
                onCancel();
            }
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, ''); // Digits only
        setInput(val);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50" onClick={onCancel}>
            <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <h2 className="text-zinc-400 uppercase tracking-widest font-bold text-sm">Manual Time Entry</h2>
                <div className="text-8xl font-mono font-bold text-zinc-100 min-h-[1em]">
                    {getFormatted(input)}
                </div>
                <input 
                    ref={inputRef}
                    type="text" 
                    value={input}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="opacity-0 absolute pointer-events-none"
                />
                <p className="text-zinc-500 text-xs">Type digits. Press Enter to save.</p>
            </div>
        </div>
    );
};
