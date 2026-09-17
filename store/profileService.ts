import { RecentProfile } from '../types';

export const MAX_RECENT_PROFILES = 8;

export const guestProfileLabel = (id: string): string => `Guest ${id.slice(-4)}`;

export const rememberRecentProfile = (profiles: RecentProfile[], profile: RecentProfile): RecentProfile[] =>
	[profile, ...profiles.filter((item) => item.id !== profile.id)]
		.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
		.slice(0, MAX_RECENT_PROFILES);

export const canSwitchProfile = (pendingActionCount: number): boolean => pendingActionCount === 0;

export const parseRecentProfiles = (value: string | null): RecentProfile[] => {
	try {
		const parsed = JSON.parse(value || '[]');
		return Array.isArray(parsed) ? parsed.filter((profile): profile is RecentProfile =>
			profile && typeof profile.id === 'string' && typeof profile.label === 'string' && typeof profile.isGuest === 'boolean') : [];
	} catch {
		return [];
	}
};

export type ProfileKeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;
export const RECENT_PROFILES_STORAGE_KEY = 'cmostimer_recent_profiles';

/** Isolates profile metadata from browser storage and provides a future-safe key namespace for profile data. */
export const profileScopedStorageKey = (profileId: string, key: string): string => `cmostimer_profile_${profileId}_${key}`;

export const createProfileRepository = (store: ProfileKeyValueStore) => ({
	loadRecent: (): RecentProfile[] => parseRecentProfiles(store.getItem(RECENT_PROFILES_STORAGE_KEY)),
	remember: (profile: RecentProfile): RecentProfile[] => {
		const next = rememberRecentProfile(parseRecentProfiles(store.getItem(RECENT_PROFILES_STORAGE_KEY)), profile);
		store.setItem(RECENT_PROFILES_STORAGE_KEY, JSON.stringify(next));
		return next;
	}
});
