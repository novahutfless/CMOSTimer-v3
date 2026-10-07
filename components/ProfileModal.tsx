import React, { useState } from 'react';
import { t } from '../translations';
import { Language, AuthState } from '../types';
import { AppStoreActions } from '../hooks/useAppStore';
import { User, LogIn, UserPlus, Cloud, CheckCircle, ImagePlus, Trash2, Users } from 'lucide-react';
import { getLocale } from '../utils';
import { Modal, ModalCloseButton } from './Modal';
import { EMAIL_MAX_BYTES, PASSWORD_MAX_BYTES, USERNAME_MAX_BYTES, validateLoginFields, validateRegistrationFields } from '../utils/accountValidation';

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
	const [switching, setSwitching] = useState(false);
	const [avatarLoading, setAvatarLoading] = useState(false);
	const profiles = actions.recentProfiles();
	const changeAvatar = async (file: File): Promise<void> => {
		if (!file.type.match(/^image\/(png|jpeg|webp|gif)$/) || file.size > 500_000) {
			setError('Choose a PNG, JPEG, WebP, or GIF smaller than 500 KB.');
			return;
		}
		setAvatarLoading(true);
		try {
			const dataUrl = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = (): void => resolve(String(reader.result));
				reader.onerror = (): void => reject(new Error('Could not read the image.'));
				reader.readAsDataURL(file);
			});
			await actions.updateProfilePicture(dataUrl);
			setError('');
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : String(reason));
		} finally {
			setAvatarLoading(false);
		}
	};

	const validate = (): string | null => {
		if (mode === 'REGISTER') {
			const invalidField = validateRegistrationFields(username, password, email);
			if (invalidField) return t(`profile.validation.${invalidField}`, language);
		} else {
			const invalidField = validateLoginFields(username, password);
			if (invalidField) return t(`profile.validation.${invalidField}`, language);
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

	if (auth.user && !switching)
		return (
			<Modal ariaLabel={auth.user.isGuest ? `Guest profile (${auth.user.id})` : auth.user.username} onClose={onClose} className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6 shadow-2xl">
				<div className="flex justify-between items-center mb-6">
					<h2 className="font-bold text-zinc-100 flex items-center gap-2">
						<User size={20} /> {auth.user.isGuest ? `Guest profile (${auth.user.id})` : auth.user.username}
					</h2>
					<ModalCloseButton onClick={onClose} />
				</div>
				<div className="mb-5 flex items-center gap-4 rounded border border-zinc-800 bg-zinc-950 p-4">
					{auth.user.avatarUrl ? <img src={auth.user.avatarUrl} alt="Profile" className="h-16 w-16 rounded-full border border-zinc-700 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-zinc-500"><User size={28} /></div>}
					<div className="flex flex-1 flex-wrap gap-2">
						<label className="flex cursor-pointer items-center gap-2 rounded bg-zinc-800 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700">
							<ImagePlus size={14} /> Choose picture
							<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={avatarLoading} className="hidden" onChange={event => {
								const file = event.target.files?.[0];
								event.target.value = '';
								if (file) void changeAvatar(file);
							}} />
						</label>
						{auth.user.avatarUrl && <button disabled={avatarLoading} onClick={() => void actions.updateProfilePicture(null)} className="flex items-center gap-2 rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-red-400"><Trash2 size={14} /> Remove</button>}
					</div>
				</div>
				{error && <div className="mb-4 rounded border border-red-900/30 bg-red-900/10 p-2 text-xs text-red-400">{error}</div>}

				<div className="flex items-center gap-3 bg-zinc-950 p-4 rounded border border-zinc-800 mb-6">
					{auth.isSynced ? <CheckCircle size={20} className="text-green-500" /> : <Cloud size={20} className="text-blue-400 animate-pulse" />}
					<div className="flex flex-col">
						<span className="text-sm text-zinc-200 font-bold">
							{auth.isSynced ? t('profile.synced', language) : t('profile.syncing', language)}
						</span>
						{auth.lastSyncTime && (
							<span className="text-[10px] text-zinc-500">
								{t('profile.lastSync', language)} {new Date(auth.lastSyncTime).toLocaleTimeString(getLocale(language))}
							</span>
						)}
					</div>
				</div>

				<button
					onClick={() => setSwitching(true)}
					className="w-full py-2 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded transition-colors text-sm font-bold mb-3"
				>
						Switch profile / sign in
				</button>
				<button
					onClick={() => {
						actions.logout(); onClose();
					}}
					className="w-full py-2 border border-red-900/50 text-red-400 hover:bg-red-900/20 rounded transition-colors text-sm font-bold"
				>
					{t('profile.logout', language)}
				</button>
			</Modal>
		);


	return (
		<Modal ariaLabel={t('profile.title', language)} onClose={onClose} className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
					<Cloud size={24} className="text-blue-500"/> {t('profile.title', language)}
				</h2>
				<ModalCloseButton onClick={onClose} size={24} />
			</div>

			<>
				{(
					<div className="mb-5">
						<div className="text-xs font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2"><Users size={14} /> Recent profiles</div>
						<div className="space-y-2">
							{profiles.map(profile => (
								<button key={profile.id} type="button" disabled={loading} onClick={() => {
									if (profile.isGuest) {
										setLoading(true);
										void actions.useGuestProfile(profile).then(onClose).catch((err: unknown) => {
											setError(err instanceof Error ? err.message : 'Could not open guest profile.'); setLoading(false);
										});
									} else {
										setMode('LOGIN'); setUsername(profile.username || profile.label); setError('');
									}
								}} className="w-full text-left px-3 py-2 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-sm text-zinc-200">
									<span className="flex items-center gap-2">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800"><User size={14} /></span>}{profile.isGuest ? `Guest profile · ${profile.label}` : profile.label}</span>
								</button>
							))}
						</div>
						<button type="button" disabled={loading} onClick={() => {
							setLoading(true);
							void actions.createGuestProfile().then(onClose).catch((err: unknown) => {
								setError(err instanceof Error ? err.message : 'Could not create guest profile.'); setLoading(false);
							});
						}} className="mt-2 w-full py-2 border border-dashed border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded text-sm">
								Create a new guest profile
						</button>
					</div>
				)}
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
							maxLength={USERNAME_MAX_BYTES}
							value={username}
							onChange={e => setUsername(e.target.value)}
							className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-200 outline-none focus:border-blue-500"
						/>
						{mode === 'REGISTER' && <p className="mt-1 text-[10px] text-zinc-600">{t('profile.validation.username', language)}</p>}
					</div>
					{mode === 'REGISTER' && (
						<div>
							<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('profile.email', language)}</label>
							<input
								type="email"
								required
								maxLength={EMAIL_MAX_BYTES}
								value={email}
								onChange={e => setEmail(e.target.value)}
								className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-200 outline-none focus:border-blue-500"
							/>
							<p className="mt-1 text-[10px] text-zinc-600">{t('profile.validation.email', language)}</p>
						</div>
					)}
					<div>
						<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('profile.password', language)}</label>
						<input
							type="password"
							required
							maxLength={PASSWORD_MAX_BYTES}
							value={password}
							onChange={e => setPassword(e.target.value)}
							className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-200 outline-none focus:border-blue-500"
						/>
						{mode === 'REGISTER' && <p className="mt-1 text-[10px] text-zinc-600">{t('profile.validation.password', language)}</p>}
					</div>

					{error && <div className="text-red-400 text-xs bg-red-900/10 p-2 rounded border border-red-900/30">{error}</div>}

					<button
						type="submit"
						disabled={loading}
						className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors disabled:opacity-50"
					>
						{loading ? t('common.processing', language) : (mode === 'LOGIN' ? t('profile.login', language) : t('profile.register', language))}
					</button>
				</form>
			</>
		</Modal>
	);
};
