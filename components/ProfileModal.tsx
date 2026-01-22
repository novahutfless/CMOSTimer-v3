
import React, { useState } from 'react';
import { t } from '../translations';
import { Language, AuthState } from '../types';
import { AppStoreActions } from '../hooks/useAppStore';
import { X, User, LogIn, UserPlus, AlertTriangle, Cloud, CheckCircle } from 'lucide-react';

interface Props {
    onClose: () => void;
    language: Language;
    auth: AuthState;
    actions: AppStoreActions;
}

type Mode = 'LOGIN' | 'REGISTER';

export const ProfileModal: React.FC<Props> = ({ onClose, language, auth, actions }) => {
	const [mode, setMode] = useState<Mode>('LOGIN');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [conflict, setConflict] = useState(false);

	const validate = (): string | null => {
		if (mode === 'REGISTER') {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) return t('profile.validation.email', language);
			if (username.length < 5 || username.length > 64) return t('profile.validation.username', language);
			if (password.length < 8 || password.length > 1000) return t('profile.validation.password', language);
		}
		return null;
	};

	const handleSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();
		setError('');
        
		const validationError = validate();
		if (validationError) {
			setError(validationError);
			return;
		}

		setLoading(true);

		try {
			if (mode === 'REGISTER') {
				await actions.register(username, password, email);
				onClose();
			} else {
				// Login Flow
				if (!conflict && actions.hasSignificantLocalData()) {
					setConflict(true);
					setLoading(false);
					return;
				}
				await actions.login(username, password);
				onClose();
			}
		} catch (err: unknown) {
			let message = t('profile.error', language);
			if (err instanceof Error && err.message) {
				message = err.message;
			} else if (typeof err === 'string') {
				message = err;
			}
			setError(message);
			setLoading(false);
		}
	};

	if (auth.user) 
		return (
			<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
				<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
					<div className="flex justify-between items-center mb-6">
						<h2 className="font-bold text-zinc-100 flex items-center gap-2">
							<User size={20} /> {auth.user.username}
						</h2>
						<button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={20}/></button>
					</div>
                    
					<div className="flex items-center gap-3 bg-zinc-950 p-4 rounded border border-zinc-800 mb-6">
						{auth.isSynced ? <CheckCircle size={20} className="text-green-500" /> : <Cloud size={20} className="text-blue-400 animate-pulse" />}
						<div className="flex flex-col">
							<span className="text-sm text-zinc-200 font-bold">
								{auth.isSynced ? t('profile.synced', language) : t('profile.syncing', language)}
							</span>
							{auth.lastSyncTime && (
								<span className="text-[10px] text-zinc-500">
                                     Last: {new Date(auth.lastSyncTime).toLocaleTimeString()}
								</span>
							)}
						</div>
					</div>

					<button 
						onClick={() => {
							actions.logout(); onClose(); 
						}}
						className="w-full py-2 border border-red-900/50 text-red-400 hover:bg-red-900/20 rounded transition-colors text-sm font-bold"
					>
						{t('profile.logout', language)}
					</button>
				</div>
			</div>
		);
    

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
			<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
						<Cloud size={24} className="text-blue-500"/> {t('profile.title', language)}
					</h2>
					<button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={24}/></button>
				</div>

				{conflict ? (
					<div className="space-y-4">
						<div className="bg-red-900/20 border border-red-900/50 p-4 rounded flex gap-3">
							<AlertTriangle className="text-red-500 shrink-0" size={24} />
							<div className="space-y-2">
								<h3 className="text-red-400 font-bold text-sm">{t('profile.conflict', language)}</h3>
								<p className="text-xs text-zinc-300 leading-relaxed">{t('profile.conflictDesc', language)}</p>
							</div>
						</div>
						<div className="flex gap-3 pt-2">
							<button 
								onClick={() => setConflict(false)} 
								className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded text-sm hover:bg-zinc-700"
							>
								{t('btn.cancel', language)}
							</button>
							<button 
								onClick={handleSubmit} 
								className="flex-1 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-500"
							>
								{t('btn.continue', language)}
							</button>
						</div>
					</div>
				) : (
					<>
						<div className="flex mb-6 bg-zinc-950 rounded p-1">
							<button 
								onClick={() => {
									setMode('LOGIN'); setError(''); 
								}}
								className={`flex-1 py-2 text-sm font-bold rounded flex items-center justify-center gap-2 transition-colors ${mode === 'LOGIN' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
							>
								<LogIn size={16} /> {t('profile.login', language)}
							</button>
							<button 
								onClick={() => {
									setMode('REGISTER'); setError(''); 
								}}
								className={`flex-1 py-2 text-sm font-bold rounded flex items-center justify-center gap-2 transition-colors ${mode === 'REGISTER' ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
							>
								<UserPlus size={16} /> {t('profile.register', language)}
							</button>
						</div>

						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('profile.username', language)}</label>
								<input 
									type="text" 
									required
									value={username}
									onChange={e => setUsername(e.target.value)}
									className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-200 outline-none focus:border-blue-500"
								/>
							</div>
							{mode === 'REGISTER' && (
								<div>
									<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('profile.email', language)}</label>
									<input 
										type="email" 
										required
										value={email}
										onChange={e => setEmail(e.target.value)}
										className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-200 outline-none focus:border-blue-500"
									/>
								</div>
							)}
							<div>
								<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('profile.password', language)}</label>
								<input 
									type="password" 
									required
									value={password}
									onChange={e => setPassword(e.target.value)}
									className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-200 outline-none focus:border-blue-500"
								/>
							</div>

							{error && <div className="text-red-400 text-xs bg-red-900/10 p-2 rounded border border-red-900/30">{error}</div>}

							<button 
								type="submit" 
								disabled={loading}
								className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors disabled:opacity-50"
							>
								{loading ? 'Processing...' : (mode === 'LOGIN' ? t('profile.login', language) : t('profile.register', language))}
							</button>
						</form>
					</>
				)}
			</div>
		</div>
	);
};
