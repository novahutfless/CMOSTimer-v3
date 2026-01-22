
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface Toast {
    id: string;
    message: string;
    duration: number;
}

interface Props {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<Props> = ({ toasts, onDismiss }) => {
	return (
		<div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
			{toasts.map(toast => (
				<ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
			))}
		</div>
	);
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
	const [opacity, setOpacity] = useState(0);

	useEffect(() => {
		// Fade in
		requestAnimationFrame(() => setOpacity(1));

		const timer = setTimeout(() => {
			setOpacity(0);
			setTimeout(() => onDismiss(toast.id), 300); // Wait for fade out
		}, toast.duration);

		return () => clearTimeout(timer);
	}, [toast, onDismiss]);

	return (
		<div 
			className="bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-3 rounded shadow-lg flex items-center gap-3 min-w-[250px] max-w-[400px] transition-all duration-300 pointer-events-auto transform translate-y-0"
			style={{ opacity, transform: `translateY(${opacity === 0 ? '10px' : '0'})` }}
		>
			<span className="text-sm flex-1">{toast.message}</span>
			<button onClick={() => { setOpacity(0); setTimeout(() => onDismiss(toast.id), 300); }} className="text-zinc-500 hover:text-zinc-300">
				<X size={14} />
			</button>
		</div>
	);
};
