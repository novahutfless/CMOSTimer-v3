
import { FullStateData, User, SyncAction } from '../types';
import { generateId } from './common';

const API_URL = 'https://speed-cmos.com/v3/api/index.php';

export class ApiError extends Error {
    constructor(public message: string, public status: number) {
        super(message);
    }
}

async function request<T>(route: string, payload: any = {}, token?: string): Promise<T> {
    const body = {
        route,
        ...payload
    };

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    let data;
    const text = await res.text();
    
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new ApiError(`Server Error: ${text.substring(0, 100)}...`, res.status);
    }

    if (!res.ok || (data && data.error)) {
        throw new ApiError(data.message || data.error || 'An error occurred', res.status);
    }

    return data as T;
}

export const api = {
    login: (credentials: { username: string; password: string }) => {
        return request<{ token: string; user: User; data?: FullStateData }>('login', credentials);
    },

    register: (payload: { username: string; password: string; email: string; initialData?: FullStateData }) => {
        return request<{ token: string; user: User }>('register', payload);
    },

    sync: async (token: string, actions: SyncAction[], lastSyncTimestamp: number) => {
        return request<{ success: boolean; syncedAt: number }>('sync', { actions, lastSyncTimestamp }, token);
    },

    getData: (token: string) => {
        return request<FullStateData>('get_data', {}, token);
    }
};
