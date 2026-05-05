
import { FullStateData, User, SyncAction } from '../types';

const envApiUrl = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL;
const API_URL = envApiUrl?.trim() || 'https://speed-cmos.com/v3/api/index.php';

export class ApiError extends Error {
	constructor(public override message: string, public status: number) {
		super(message);
	}
}

async function request<T>(route: string, payload: Record<string, unknown> = {}, token?: string): Promise<T> {
	const body = {
		route,
		...payload,
		...(token ? { authToken: token } : {})
	};

	const headers: HeadersInit = {
		'Content-Type': 'application/json',
	};

	if (token) 
		headers['Authorization'] = `Bearer ${token}`;

	const res = await fetch(API_URL, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	});

	let data;
	const text = await res.text();
    
	try {
		data = JSON.parse(text);
	} catch {
		throw new ApiError(`Server Error: ${text.substring(0, 100)}...`, res.status);
	}

	if (!res.ok || (data && data.error)) 
		throw new ApiError(data.message || data.error || 'An error occurred', res.status);

	return data as T;
}

export const api = {
	login: (credentials: { username: string; password: string }): Promise<{ token: string; user: User; data?: FullStateData }> => {
		return request<{ token: string; user: User; data?: FullStateData }>('login', credentials);
	},

	register: (payload: { username: string; password: string; email: string; initialData?: FullStateData }): Promise<{ token: string; user: User }> => {
		return request<{ token: string; user: User }>('register', payload);
	},

	sync: (token: string, actions: SyncAction[], lastSyncTimestamp: number): Promise<{ success: boolean; syncedAt: number }> => {
		return request<{ success: boolean; syncedAt: number }>('sync', { actions, lastSyncTimestamp }, token);
	},

	getData: (token: string): Promise<FullStateData> => {
		return request<FullStateData>('get_data', {}, token);
	}
};
