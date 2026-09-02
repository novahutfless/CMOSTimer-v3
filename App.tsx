import React, { useEffect, useState } from 'react';
import { AppStoreProvider } from './hooks/useAppStore';
import { ModalProvider } from './components/ModalProvider';
import AppLayout from './components/app/AppLayout';
import { Toast, ToastContainer } from './components/ToastContainer';

const AppContent: React.FC = () => {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [lastClickedId, setLastClickedId] = useState<string | null>(null);
	const [toasts, setToasts] = useState<Toast[]>([]);

	useEffect(() => {
		const showPersistenceFailure = (event: Event): void => {
			const detail = (event as CustomEvent<{ message?: string }>).detail;
			const message = detail?.message || 'CMOSTimer could not save your latest changes. Keep this tab open and export a backup.';
			setToasts(previous => previous.some(toast => toast.message === message)
				? previous
				: [...previous, { id: `persistence-${Date.now()}`, message, duration: 15000 }]);
		};
		window.addEventListener('cmostimer-persistence-error', showPersistenceFailure);
		return (): void => window.removeEventListener('cmostimer-persistence-error', showPersistenceFailure);
	}, []);

	return (
		<>
			<ModalProvider
				selectedIds={selectedIds}
				setSelectedIds={setSelectedIds}
				lastClickedId={lastClickedId}
				setLastClickedId={setLastClickedId}
			>
				<AppLayout
					selectedIds={selectedIds}
					setSelectedIds={setSelectedIds}
					lastClickedId={lastClickedId}
					setLastClickedId={setLastClickedId}
				/>
			</ModalProvider>
			<ToastContainer toasts={toasts} onDismiss={(id) => setToasts(previous => previous.filter(toast => toast.id !== id))} />
		</>
	);
};

const App: React.FC = () => {
	return (
		<AppStoreProvider>
			<AppContent />
		</AppStoreProvider>
	);
};

export default App;
