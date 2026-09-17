import { describe, expect, it } from 'vitest';
import { canSwitchProfile, createProfileRepository, guestProfileLabel, parseRecentProfiles, profileScopedStorageKey, rememberRecentProfile } from '../../store/profileService';

describe('profile service', () => {
	it('keeps recent profiles distinct, ordered, and bounded', () => {
		const profiles = Array.from({ length: 9 }, (_, index) => ({ id: String(index), label: `Guest ${index}`, isGuest: true, lastUsedAt: index }));
		const next = rememberRecentProfile(profiles, { id: '3', label: 'Guest 3 renamed', isGuest: true, lastUsedAt: 99 });
		expect(next).toHaveLength(8);
		expect(next[0].label).toBe('Guest 3 renamed');
		expect(next.filter(profile => profile.id === '3')).toHaveLength(1);
	});

	it('treats invalid persisted data as no profiles and blocks switching with pending work', () => {
		expect(parseRecentProfiles('{bad json')).toEqual([]);
		expect(canSwitchProfile(0)).toBe(true);
		expect(canSwitchProfile(1)).toBe(false);
		expect(guestProfileLabel('123456')).toBe('Guest 3456');
	});

	it('uses a repository boundary for local profile metadata', () => {
		const values = new Map<string, string>();
		const repository = createProfileRepository({
			getItem: (key: string): string | null => values.get(key) ?? null,
			setItem: (key: string, value: string): void => {
				values.set(key, value);
			}
		});
		repository.remember({ id: 'guest-1', label: 'Guest 0001', isGuest: true, token: 'secret', lastUsedAt: 1 });
		expect(repository.loadRecent().map(profile => profile.id)).toEqual(['guest-1']);
		expect(profileScopedStorageKey('guest-1', 'solves')).toBe('cmostimer_profile_guest-1_solves');
	});
});
