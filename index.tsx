import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializePlatformStorage } from './utils/platformStorage';

const rootElement = document.getElementById('root');
if (!rootElement) 
	throw new Error("Could not find root element to mount to");


const root = ReactDOM.createRoot(rootElement);

void initializePlatformStorage().finally(() => {
	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
});
