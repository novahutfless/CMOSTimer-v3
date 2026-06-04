import React, { useState, useEffect, useRef } from 'react';
import { Penalty, TimePrecision } from '../types';
import { formatTime } from '../utils';

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

	const parseInput = (raw: string): number => {
		const clean = raw.replace(/\D/g, '');
		if (!clean) return 0;

		let decimalDigits = 2; // Default CENTI
		if (precision === TimePrecision.MILLI) decimalDigits = 3;
		else if (precision === TimePrecision.DECI) decimalDigits = 1;
		else if (precision === TimePrecision.SECONDS) decimalDigits = 0;

		let decimals = 0;
		// Extract decimals
		if (decimalDigits > 0) {
			// Slice takes the last N digits regardless of string length (e.g. "5".slice(-3) is "5")
			const decStr = clean.slice(-decimalDigits);
			const decVal = parseInt(decStr, 10);
            
			// Scale based on precision to get milliseconds
			// MILLI (3 digits): x1
			// CENTI (2 digits): x10
			// DECI (1 digit): x100
			const multiplier = Math.pow(10, 3 - decimalDigits);
			decimals = decVal * multiplier;
		}

		// Extract Integer Part (everything before decimals)
		const intStr = clean.length > decimalDigits ? clean.slice(0, clean.length - decimalDigits) : "";
        
		let seconds = 0;
		let minutes = 0;

		if (intStr) {
			const secStr = intStr.slice(-2);
			seconds = parseInt(secStr, 10);

			const minStr = intStr.length > 2 ? intStr.slice(0, -2) : "";
			if (minStr) 
				minutes = parseInt(minStr, 10);
            
		}

		return minutes * 60000 + seconds * 1000 + decimals;
	};

	const getFormatted = (raw: string): string => {
		const ms = parseInput(raw);
		return formatTime(ms, Penalty.NONE, precision);
	};

	const handleKeyDown = (e: React.KeyboardEvent): void => {
		if (e.key === 'Enter') {
			const ms = parseInput(input);
			if (ms > 0) 
				onConfirm(ms);
			else if (input === '') 
				onCancel();
            
		} else if (e.key === 'Escape') {
			onCancel();
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
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
					inputMode="numeric"
				/>
				<p className="text-zinc-500 text-xs">Type digits. Press Enter to save.</p>
			</div>
		</div>
	);
};
