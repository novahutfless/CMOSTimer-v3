import React, { useEffect, useRef, useState } from 'react';
import { PuzzleType, ScrambleImageConfig, Language } from '../../types';
import { ScrambleDisplay } from './ScrambleDisplay';
import { getScrambler } from '../../utils/scramblerRegistry';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { t } from '../../translations';

interface Props {
    scramble: string[][];
    visualizerState: { activeScrambleIndex?: number; activeMoveIndex?: number };
    className?: string;
    scramblerIds: string[];
    imageConfig: ScrambleImageConfig;
    language: Language;
}

export const ScrambleImageWidget: React.FC<Props> = (dta: Props) => {
	const { scramble, visualizerState, className, scramblerIds, imageConfig, language } = dta;
	const [currentScrambleIdx, setCurrentScrambleIdx] = useState(0);
	const [limitMoves, setLimitMoves] = useState<number | null>(null);
	const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
	const copyTimeoutRef = useRef<number | null>(null);
	const displayContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (visualizerState.activeScrambleIndex !== undefined) {
			setCurrentScrambleIdx(visualizerState.activeScrambleIndex);
			setLimitMoves(visualizerState.activeMoveIndex ?? null);
		} else {
			setCurrentScrambleIdx(0);
			setLimitMoves(null);
		}
	}, [visualizerState]);

	useEffect(() => {
		setCurrentScrambleIdx(0);
		setLimitMoves(null);
	}, [scramble]);

	useEffect(() => {
		return (): void => {
			if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current);
		};
	}, []);

	const safeScramblerIds = scramblerIds && scramblerIds.length > 0 ? scramblerIds : ['333'];
	const currentScramblerId = safeScramblerIds[currentScrambleIdx] || safeScramblerIds[0];
	const scramblerDef = getScrambler(currentScramblerId);
	const visualType = scramblerDef ? scramblerDef.visualizer : PuzzleType.THREE;

	const currentMoves = scramble[currentScrambleIdx] || [];
	const displayMoves = limitMoves !== null ? currentMoves.slice(0, limitMoves + 1) : currentMoves;

	const prev = (): void => {
		setCurrentScrambleIdx(idx => Math.max(0, idx - 1));
		setLimitMoves(null);
	};

	const next = (): void => {
		setCurrentScrambleIdx(idx => Math.min(scramble.length - 1, idx + 1));
		setLimitMoves(null);
	};

	const clearCopyStateLater = (): void => {
		if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current);
		copyTimeoutRef.current = window.setTimeout(() => setCopyState('idle'), 1200);
	};

	const copyCurrentImage = async (): Promise<void> => {
		if (!displayContainerRef.current) return;

		const svg = displayContainerRef.current.querySelector('svg');
		if (!svg || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
			setCopyState('failed');
			clearCopyStateLater();
			return;
		}

		try {
			const cloned = svg.cloneNode(true) as SVGSVGElement;
			const bbox = svg.getBoundingClientRect();
			const width = Math.max(1, Math.round(bbox.width));
			const height = Math.max(1, Math.round(bbox.height));

			if (!cloned.getAttribute('xmlns')) cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
			cloned.setAttribute('width', String(width));
			cloned.setAttribute('height', String(height));
			cloned.setAttribute('viewBox', cloned.getAttribute('viewBox') || `0 0 ${width} ${height}`);

			const serialized = new XMLSerializer().serializeToString(cloned);
			const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
			const blobUrl = URL.createObjectURL(svgBlob);

			const image = new Image();
			image.src = blobUrl;

			await new Promise<void>((resolve, reject) => {
				image.onload = ():void => resolve();
				image.onerror = ():void => reject(new Error('Failed to load SVG image'));
			});

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('No 2D context available');
			ctx.drawImage(image, 0, 0, width, height);
			URL.revokeObjectURL(blobUrl);

			const pngBlob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob((blob) => {
					if (blob) resolve(blob);
					else reject(new Error('Failed to create PNG blob'));
				}, 'image/png');
			});

			await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
			setCopyState('copied');
		} catch {
			setCopyState('failed');
		} finally {
			clearCopyStateLater();
		}
	};

	return (
		<div className={`flex flex-col items-center justify-center w-full h-full p-2 relative group ${className}`}>
			<button
				type="button"
				onClick={() => { void copyCurrentImage(); }}
				className="h-full w-auto max-h-[200px] opacity-90 hover:opacity-100 transition-opacity cursor-copy"
				title={t('scrambleImage.copyTitle', language)}
			>
				<div ref={displayContainerRef} className="h-full w-auto">
					<ScrambleDisplay
						scramble={displayMoves}
						type={visualType}
						config={imageConfig}
						className="h-full max-h-[200px] w-auto"
					/>
				</div>
			</button>

			{copyState !== 'idle' && (
				<div className={`absolute top-2 right-2 text-[10px] px-2 py-1 rounded border ${copyState === 'copied' ? 'bg-green-900/70 border-green-600 text-green-200' : 'bg-red-900/70 border-red-600 text-red-200'}`}>
					{copyState === 'copied' ? t('scrambleImage.copied', language) : t('scrambleImage.copyFailed', language)}
				</div>
			)}

			{scramble.length > 1 && (
				<div className="absolute inset-x-0 bottom-2 flex justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
					<button
						onClick={(e) => { e.stopPropagation(); prev(); }}
						disabled={currentScrambleIdx === 0}
						className="p-1 bg-zinc-900/80 rounded-full text-zinc-300 disabled:opacity-30 hover:bg-zinc-800"
					>
						<ChevronLeft size={20} />
					</button>
					<span className="text-xs bg-zinc-900/80 px-2 py-1 rounded text-zinc-300 font-mono">
						{currentScrambleIdx + 1} / {scramble.length}
					</span>
					<button
						onClick={(e) => { e.stopPropagation(); next(); }}
						disabled={currentScrambleIdx === scramble.length - 1}
						className="p-1 bg-zinc-900/80 rounded-full text-zinc-300 disabled:opacity-30 hover:bg-zinc-800"
					>
						<ChevronRight size={20} />
					</button>
				</div>
			)}
		</div>
	);
};
