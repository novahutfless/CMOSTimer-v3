import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { Goal, Session } from '../types';
import SettingsModal from './SettingsModal';
import SessionManager from './SessionManager';
import { ManualEntry } from './ManualEntry';
import { CommandPalette } from './CommandPalette';
import { ProfileModal } from './ProfileModal';
import { DataManagementModal } from './DataManagementModal';
import { GoalManagerModal } from './GoalManagerModal';
import { MoveSolvesModal } from './MoveSolvesModal';
import AboutModal from './AboutModal';
import SolveDetailsModal from './SolveDetailsModal';
import SessionSettingsModal from './SessionSettingsModal';
import StatisticsModal from './StatisticsModal';
import { PluginDialogModal } from './PluginDialogModal';
import { RewindModal } from './RewindModal';

type ModalMode = 'MOVE' | 'DUPLICATE';
export type ModalState =
	| { type: 'SESSION_MANAGER' | 'MANUAL_ENTRY' | 'COMMAND' | 'SETTINGS' | 'PROFILE' | 'DATA' | 'STATISTICS' | 'REWIND' | 'ABOUT' }
	| { type: 'SESSION_SETTINGS'; data: Session }
	| { type: 'DETAILS'; data: string }
	| { type: 'MOVE'; data: string[]; mode: ModalMode }
	| { type: 'GOAL_MANAGER'; data?: Goal }
	| { type: 'PLUGIN_ALERT'; data: string; resolve?: () => void }
	| { type: 'PLUGIN_PROMPT'; data: { msg: string; def?: string }; resolve?: (value: string | null) => void };

type ModalContextValue = {
	modal: ModalState | null;
	openModal: (next: ModalState) => void;
	closeModal: () => void;
	isModalOpen: boolean;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export const useModal = (): ModalContextValue => {
	const context = useContext(ModalContext);
	if (!context) throw new Error('useModal must be used within ModalProvider');
	return context;
};

type ModalProviderProps = {
	children: React.ReactNode;
	selectedIds: Set<string>;
	lastClickedId: string | null;
	setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
	setLastClickedId: React.Dispatch<React.SetStateAction<string | null>>;
};

export const ModalProvider: React.FC<ModalProviderProps> = ({
	children,
	selectedIds,
	lastClickedId,
	setSelectedIds,
	setLastClickedId
}) => {
	const {
		sessions, solves, currentSession, currentSessionId, setCurrentSessionId,
		settings, setSettings, statsConfig, setStatsConfig,
		effectiveSettings, computedSolves, auth, actions
	} = useAppStore();

	const [modal, setModal] = useState<ModalState | null>(null);
	const closeModal = useCallback((): void => {
		setModal(prev => {
			if (prev?.type === 'PLUGIN_PROMPT') prev.resolve?.(null);
			if (prev?.type === 'PLUGIN_ALERT') prev.resolve?.();
			return null;
		});
	}, []);
	const openModal = useCallback((next: ModalState): void => setModal(next), []);

	const value = useMemo(() => ({
		modal,
		openModal,
		closeModal,
		isModalOpen: modal !== null
	}), [modal, openModal, closeModal]);

	return (
		<ModalContext.Provider value={value}>
			{children}

			{modal?.type === 'SETTINGS' && (
				<SettingsModal
					config={statsConfig}
					settings={settings}
					sessions={sessions}
					onSaveStats={setStatsConfig}
					onSaveSettings={setSettings}
					onClose={closeModal}
				/>
			)}
			{modal?.type === 'SESSION_MANAGER' && (
				<SessionManager
					sessions={sessions}
					solvesMap={solves}
					currentSessionId={currentSessionId}
					settings={settings}
					onSwitch={(id) => {
						setCurrentSessionId(id); closeModal();
					}}
					onCreate={actions.createSession}
					onUpdate={actions.updateSession}
					onDelete={actions.deleteSession}
					onConfigure={(id) => {
						const session = sessions.find(s => s.id === id);
						if (session) openModal({ type: 'SESSION_SETTINGS', data: session });
					}}
					onClose={closeModal}
				/>
			)}
			{modal?.type === 'SESSION_SETTINGS' && modal.data && (
				<SessionSettingsModal
					session={modal.data}
					sessions={sessions}
					settings={settings}
					language={settings.language}
					onUpdate={actions.updateSession}
					onClose={() => openModal({ type: 'SESSION_MANAGER' })}
				/>
			)}
			{modal?.type === 'STATISTICS' && (
				<StatisticsModal
					sessions={sessions}
					solvesMap={solves}
					currentSessionId={currentSessionId}
					settings={settings}
					statsConfig={statsConfig}
					onClose={closeModal}
				/>
			)}
			{modal?.type === 'PROFILE' && (
				<ProfileModal
					auth={auth}
					actions={actions}
					language={settings.language}
					onClose={closeModal}
				/>
			)}
			{modal?.type === 'DATA' && (
				<DataManagementModal
					sessions={sessions}
					solvesMap={solves}
					settings={settings}
					statsConfig={statsConfig}
					currentSessionId={currentSessionId}
					actions={actions}
					language={settings.language}
					onClose={closeModal}
				/>
			)}
			{modal?.type === 'MANUAL_ENTRY' && (
				<ManualEntry
					onConfirm={(ms) => {
						const { id } = actions.addSolve(ms, -1);
						setSelectedIds(new Set([id]));
						setLastClickedId(id);
						closeModal();
					}}
					onCancel={closeModal}
					precision={effectiveSettings.timePrecision}
				/>
			)}
			{modal?.type === 'COMMAND' && (
				<CommandPalette
					onClose={closeModal}
					onOpenSettings={() => openModal({ type: 'SETTINGS' })}
					settings={settings}
					setSettings={setSettings}
					computedSolves={computedSolves}
					selectedIds={selectedIds}
					lastClickedId={lastClickedId}
					updateSolve={actions.updateSolve}
					onRewind={() => openModal({ type: 'REWIND' })}
				/>
			)}
			{modal?.type === 'REWIND' && (
				<RewindModal
					sessions={sessions}
					solvesMap={solves}
					language={settings.language}
					dateFormat={settings.dateFormat}
					onClose={closeModal}
				/>
			)}
			{modal?.type === 'ABOUT' && <AboutModal onClose={closeModal} language={settings.language} />}
			{modal?.type === 'DETAILS' && modal.data && (
				<SolveDetailsModal
					solve={computedSolves.find(s => s.id === modal.data)!}
					language={settings.language}
					precision={effectiveSettings.timePrecision}
					onUpdatePenalty={actions.updatePenalty}
					onUpdateSolve={actions.updateSolve}
					onClose={closeModal}
					sessionLocked={!!currentSession.locked}
					dateFormat={settings.dateFormat}
				/>
			)}
			{modal?.type === 'MOVE' && modal.data && (
				<MoveSolvesModal
					sessions={sessions}
					currentSessionId={currentSessionId}
					solveCount={modal.data.length}
					onMove={(targetId) => {
						if (modal.mode === 'DUPLICATE') {
							actions.duplicateSolves(targetId, modal.data);
						} else {
							actions.moveSolves(targetId, modal.data);
							setSelectedIds(new Set());
						}
						closeModal();
					}}
					onClose={closeModal}
					mode={modal.mode}
					language={settings.language}
				/>
			)}
			{modal?.type === 'GOAL_MANAGER' && (
				<GoalManagerModal
					initialGoal={modal.data}
					sessions={sessions}
					currentSessionId={currentSessionId}
					language={settings.language}
					onSave={(g) => {
						if (modal.data) actions.updateGoal(g.id, g); else actions.addGoal(g);
					}}
					onDelete={actions.deleteGoal}
					onClose={closeModal}
				/>
			)}
			{modal?.type === 'PLUGIN_ALERT' && (
				<PluginDialogModal
					type="ALERT"
					message={modal.data}
					onConfirm={() => {
						modal.resolve?.();
						setModal(null);
					}}
					onCancel={() => {
						modal.resolve?.();
						setModal(null);
					}}
				/>
			)}
			{modal?.type === 'PLUGIN_PROMPT' && (
				<PluginDialogModal
					type="PROMPT"
					message={modal.data.msg}
					defaultValue={modal.data.def}
					onConfirm={(val) => {
						if (modal.resolve) modal.resolve(val);
						setModal(null);
					}}
					onCancel={() => {
						if (modal.resolve) modal.resolve(null);
						setModal(null);
					}}
				/>
			)}
		</ModalContext.Provider>
	);
};
