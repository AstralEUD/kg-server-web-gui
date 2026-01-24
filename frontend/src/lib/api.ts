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
