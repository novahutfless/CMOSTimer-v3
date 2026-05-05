import React, { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface Props {
    type: 'ALERT' | 'PROMPT';
    message: string;
    defaultValue?: string | undefined;
    onConfirm: (val: string | null) => void;
    onCancel: () => void;
}

export const PluginDialogModal: React.FC<Props> = ({ type, message, defaultValue, onConfirm, onCancel }) => {
	const [value, setValue] = useState(defaultValue || '');
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (type === 'PROMPT' && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [type]);

	return (
		<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={onCancel}>
			<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
				<div className="flex justify-between items-start mb-4">
					<h2 className="font-bold text-zinc-100 text-lg">Plugin Message</h2>
					<button onClick={onCancel} className="text-zinc-500 hover:text-zinc-200"><X size={20}/></button>
				</div>
                
				<p className="text-zinc-300 mb-6 leading-relaxed">{message}</p>

				{type === 'PROMPT' && (
					<input 
						ref={inputRef}
						type="text" 
						value={value}
						onChange={e => setValue(e.target.value)}
						onKeyDown={e => e.key === 'Enter' && onConfirm(value)}
						className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 mb-6 text-zinc-200 outline-none focus:border-blue-500"
					/>
				)}

				<div className="flex justify-end gap-2">
					{type === 'PROMPT' && (
						<button onClick={onCancel} className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm">Cancel</button>
					)}
					<button 
						onClick={() => onConfirm(type === 'ALERT' ? null : value)}
						className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold flex items-center gap-2"
					>
						<Check size={16} /> OK
					</button>
				</div>
			</div>
		</div>
	);
};
