import React, { useEffect, useState } from 'react';
import { Check, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { ComputedSolve, Language, Penalty } from '../../types';
import { t } from '../../translations';

interface TimeListSelectionBarProps {
  selectedIds: Set<string>;
  solves: ComputedSolve[];
  sessionLocked?: boolean;
  language: Language;
  onDetails: (id: string) => void;
  onMove: (ids: string[]) => void;
  onDuplicate: (ids: string[]) => void;
  onDelete: (ids: string[], global?: boolean) => void;
  onPenalty: (id: string, penalty: Penalty) => void;
}

type ActiveMenu = 'PENALTY' | 'STATUS' | 'MOVE' | 'DELETE' | null;

export const TimeListSelectionBar: React.FC<TimeListSelectionBarProps> = ({
	selectedIds,
	solves,
	sessionLocked,
	language,
	onDetails,
	onMove,
	onDuplicate,
	onDelete,
	onPenalty
}) => {
	const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);

	useEffect(() => {
		const handleClickOutside = (): void => setActiveMenu(null);
		window.addEventListener('click', handleClickOutside);
		return (): void => window.removeEventListener('click', handleClickOutside);
	}, []);

	const toggleMenu = (e: React.MouseEvent, menu: ActiveMenu): void => {
		e.stopPropagation();
		setActiveMenu(activeMenu === menu ? null : menu);
	};

	const selectedIdsArray = Array.from(selectedIds);
	const firstSelectedSolve = solves.find(x => x.id === selectedIdsArray[0]);

	const handleBulkPenalty = (p: Penalty): void => {
		selectedIdsArray.forEach(id => {
			const s = solves.find(x => x.id === id);
			if (s) onPenalty(id, s.penalty === p ? Penalty.NONE : p);
		});
		setActiveMenu(null);
	};

	if (selectedIds.size === 0) return null;

	return (
		<div className="p-2 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur shrink-0 flex gap-2 justify-center items-center flex-wrap z-20">
			{selectedIds.size >= 1 && (
				<>
					<div className="relative flex items-stretch rounded border border-zinc-700 bg-zinc-800 h-7">
						<button
							disabled={sessionLocked}
							onClick={() => handleBulkPenalty(Penalty.PLUS_TWO)}
							className={`px-3 text-xs rounded-l hover:bg-zinc-700 font-medium ${firstSelectedSolve?.penalty === Penalty.PLUS_TWO ? 'text-blue-400' : 'text-zinc-300'} disabled:opacity-50`}
						>
							+2
						</button>
						<div className="w-px bg-zinc-700"></div>
						<button
							disabled={sessionLocked}
							onClick={(e) => toggleMenu(e, 'PENALTY')}
							className="px-1 text-zinc-400 hover:bg-zinc-700 rounded-r disabled:opacity-50"
						>
							<ChevronUp size={12} />
						</button>
						{activeMenu === 'PENALTY' && (
							<div
								className="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 min-w-[100px] flex flex-col z-50 max-h-[200px] overflow-y-auto custom-scrollbar"
								onClick={(e) => e.stopPropagation()}
							>
								{[2, 4, 6, 8, 10, 12, 14, 16].map(val => {
									const p = Penalty[`PLUS_${val === 2 ? 'TWO' : val === 4 ? 'FOUR' : val === 6 ? 'SIX' : val === 8 ? 'EIGHT' : val === 10 ? 'TEN' : val === 12 ? 'TWELVE' : val === 14 ? 'FOURTEEN' : 'SIXTEEN'}` as keyof typeof Penalty];
									return (
										<button
											key={val}
											onClick={() => handleBulkPenalty(p)}
											className="px-3 py-2 hover:bg-zinc-700 text-left text-xs text-zinc-200 flex justify-between items-center"
										>
											<span>+{val}</span>
											{firstSelectedSolve?.penalty === p && <Check size={12} className="text-blue-400" />}
										</button>
									);
								})}
							</div>
						)}
					</div>

					<div className="relative flex items-stretch rounded border border-zinc-700 bg-zinc-800 h-7">
						<button
							disabled={sessionLocked}
							onClick={() => handleBulkPenalty(Penalty.DNF)}
							className={`px-3 text-xs rounded-l hover:bg-zinc-700 font-medium ${firstSelectedSolve?.penalty === Penalty.DNF ? 'text-red-400' : 'text-zinc-300'} disabled:opacity-50`}
						>
							DNF
						</button>
						<div className="w-px bg-zinc-700"></div>
						<button
							disabled={sessionLocked}
							onClick={(e) => toggleMenu(e, 'STATUS')}
							className="px-1 text-zinc-400 hover:bg-zinc-700 rounded-r disabled:opacity-50"
						>
							<ChevronUp size={12} />
						</button>
						{activeMenu === 'STATUS' && (
							<div
								className="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 min-w-[100px] flex flex-col z-50"
								onClick={(e) => e.stopPropagation()}
							>
								<button
									onClick={() => handleBulkPenalty(Penalty.DNS)}
									className="px-3 py-2 hover:bg-zinc-700 text-left text-xs text-zinc-200 flex justify-between items-center"
								>
									<span>DNS</span>
									{firstSelectedSolve?.penalty === Penalty.DNS && <Check size={12} className="text-blue-400" />}
								</button>
							</div>
						)}
					</div>

					<div className="h-4 w-px bg-zinc-800 mx-1"></div>
				</>
			)}

			{selectedIds.size === 1 && (
				<button onClick={() => onDetails(selectedIdsArray[0])} className="h-7 px-3 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700">{t('btn.details', language)}</button>
			)}

			<div className="relative flex items-stretch rounded border border-zinc-700 bg-zinc-800 h-7">
				<button
					disabled={sessionLocked}
					onClick={() => onMove(selectedIdsArray)}
					className="px-3 text-xs rounded-l hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
				>
					{t('list.move', language)}
				</button>
				<div className="w-px bg-zinc-700"></div>
				<button
					disabled={sessionLocked}
					onClick={(e) => toggleMenu(e, 'MOVE')}
					className="px-1 text-zinc-400 hover:bg-zinc-700 rounded-r disabled:opacity-50"
				>
					<ChevronUp size={12} />
				</button>
				{activeMenu === 'MOVE' && (
					<div
						className="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 min-w-[120px] flex flex-col z-50"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={() => {
								onDuplicate(selectedIdsArray);
								setActiveMenu(null);
							}}
							className="px-3 py-2 hover:bg-zinc-700 text-left text-xs text-zinc-200 flex items-center gap-2"
						>
							<Copy size={12} /> {t('list.duplicate', language)}
						</button>
					</div>
				)}
			</div>

			<div className="relative flex items-stretch rounded border border-red-900/30 bg-red-900/20 h-7">
				<button
					disabled={sessionLocked}
					onClick={() => onDelete(selectedIdsArray)}
					className="px-3 text-xs rounded-l hover:bg-red-900/40 text-red-400 disabled:opacity-50"
				>
					{t('btn.delete', language)}
				</button>
				<div className="w-px bg-red-900/30"></div>
				<button
					disabled={sessionLocked}
					onClick={(e) => toggleMenu(e, 'DELETE')}
					className="px-1 text-red-400 hover:bg-red-900/40 rounded-r disabled:opacity-50"
				>
					<ChevronUp size={12} />
				</button>
				{activeMenu === 'DELETE' && (
					<div
						className="absolute bottom-full right-0 mb-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 min-w-[140px] flex flex-col z-50"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={() => {
								if (confirm(t('list.deleteEverywhereConfirm', language)))
									onDelete(selectedIdsArray, true);

								setActiveMenu(null);
							}}
							className="px-3 py-2 hover:bg-red-900/30 text-left text-xs text-red-400 flex items-center gap-2"
						>
							<Trash2 size={12} /> {t('list.deleteEverywhere', language)}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
