import React, { useState } from 'react';
import { AppStoreProvider } from './hooks/useAppStore';
import { ModalProvider } from './components/ModalProvider';
import AppLayout from './components/app/AppLayout';

const AppContent: React.FC = () => {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [lastClickedId, setLastClickedId] = useState<string | null>(null);

	return (
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
