import React, { useEffect, useState, useRef } from 'react';

interface VisualizerState {
	activeScrambleIndex?: number;
	activeMoveIndex?: number;
}

type ScrambleWidgetData = {
	scramble: string[][];
	visualizerState: VisualizerState;
	setVisualizerState: React.Dispatch<React.SetStateAction<VisualizerState>>;
	className?: string;
};
export const ScrambleWidget: React.FC<ScrambleWidgetData> = (dta: ScrambleWidgetData) => {
	const { scramble, visualizerState, setVisualizerState, className } = dta;

	// Local state to highlight clicked move immediately for feedback
	const [highlight, setHighlight] = useState<{ sIdx: number, mIdx: number } | null>(null);
	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

	const handleMoveClick = (sIdx: number, mIdx: number): void => {
		setHighlight({ sIdx, mIdx });
		setVisualizerState({ activeScrambleIndex: sIdx, activeMoveIndex: mIdx });
	};

	useEffect(() => {
		// Clear highlight if scramble changes completely
		setHighlight(null);
	}, [scramble]);

	// If external state resets (e.g. timer start) or changes puzzle index,
	// clear move highlight if mismatch
	useEffect(() => {
		if (visualizerState.activeScrambleIndex === undefined) 
			setHighlight(null);
		else if (highlight && highlight.sIdx !== visualizerState.activeScrambleIndex) 
		// If user switched puzzle via keyboard, clear move highlight from old puzzle
			setHighlight(null);
        

		// Scroll to active puzzle
		const idx = visualizerState.activeScrambleIndex ?? 0;
		if (itemRefs.current[idx]) 
			itemRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
	}, [visualizerState]);

	return (
		<div className={`w-full h-full overflow-y-auto custom-scrollbar relative ${className}`}>
			<div className="min-h-full flex flex-col items-center justify-center p-4">
				{scramble.map((moves, sIdx) => (
					<div 
						key={sIdx} 
						ref={el => {
							itemRefs.current[sIdx] = el; 
						}}
						className={`flex items-center justify-center flex-wrap gap-x-3 gap-y-1 text-center max-w-full mb-4 last:mb-0 ${scramble.length > 1 ? 'pb-4 border-b border-zinc-800/50 last:border-b-0' : ''}`}
					>
						{scramble.length > 1 && (
							<span className={`w-full text-xs font-mono mb-1 uppercase tracking-widest ${visualizerState.activeScrambleIndex === sIdx ? 'text-blue-400 font-bold' : 'text-zinc-600'}`}>
                                Puzzle {sIdx + 1}
							</span>
						)}
						{moves.map((m, mIdx) => {
							const isActive = highlight?.sIdx === sIdx && highlight?.mIdx === mIdx;
							return (
								<span 
									key={mIdx} 
									onMouseDown={(e) => {
										e.preventDefault(); handleMoveClick(sIdx, mIdx); 
									}}
									className={`text-xl xl:text-2xl font-mono cursor-pointer hover:text-blue-400 transition-colors select-none ${isActive ? 'text-blue-500 font-bold' : 'text-zinc-300'}`}
								>
									{m}
								</span>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
};
