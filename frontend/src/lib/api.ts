// API configuration utility
// Fix #11: Use relative URL for production, localhost for development

const getApiBaseUrl = (): string => {
    // In browser, use relative path which will work with proxy
    if (typeof window !== 'undefined') {
        // Check if we're in development mode
        if (process.env.NODE_ENV === 'development') {
            return 'http://localhost:3000';
        }
        // In production, use relative path (same origin)
        return '';
    }
    // Server-side rendering fallback
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to create full API URL
export const apiUrl = (path: string): string => {
    const base = API_BASE_URL;
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
};

// Common fetch wrapper with credentials
import { ApiResponse } from '@/types/schema';

// Helper to determine if we are in browser
const isBrowser = typeof window !== 'undefined';

export const apiFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
    return fetch(apiUrl(path), {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
};

export class ApiError extends Error {
    constructor(public message: string, public status?: number) {
        super(message);
        this.name = 'ApiError';
    }
}

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        // Fix #Login: Handle 401 globally
        if (res.status === 401 && isBrowser) {
            // Clear all auth data to prevent redirect loops
            localStorage.removeItem("username");
            localStorage.removeItem("role");
            localStorage.removeItem("auth_token");

            // Redirect to login if not already there
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }

        let errorMsg = res.statusText;
        try {
            const json = await res.json();
            errorMsg = json.error || json.message || errorMsg;
        } catch {
            // ignore JSON parse error
        }
        throw new ApiError(errorMsg, res.status);
    }

    try {
        const json = await res.json();
        // Check for standardized ApiResponse
        if (json && typeof json === 'object' && 'success' in json) {
            const apiRes = json as ApiResponse<T>;
            if (!apiRes.success) {
                throw new ApiError(apiRes.error || 'Unknown API error');
            }
            return apiRes.data as T;
        }
        // Fallback for legacy endpoints
        return json as T;
    } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new Error('Failed to parse API response');
    }
}

export const apiGet = async <T>(path: string): Promise<T> => {
    const res = await apiFetch(path);
    return handleResponse<T>(res);
};

export const apiPost = async <T>(path: string, body?: any): Promise<T> => {
    const res = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
};

export const apiPut = async <T>(path: string, body?: any): Promise<T> => {
    const res = await apiFetch(path, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
};

export const apiDelete = async <T>(path: string): Promise<T> => {
    const res = await apiFetch(path, { method: 'DELETE' });
    return handleResponse<T>(res);
};
