/**
 * API Utility for DMS Frontend to communicate with Express Backend.
 * All requests automatically include credentials (Better Auth cookies).
 */

const API_BASE_URL = '/api';

const defaultHeaders = {
    'Content-Type': 'application/json',
};

// Generic fetch wrapper to handle errors and credentials
async function fetchApi(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        credentials: 'include', // Crucial for Better Auth sessions across ports
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
        const error = (data && data.error) || response.statusText;
        throw new Error(error);
    }

    return data;
}

// Fetch helper for binary files
async function fetchBlob(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(response.statusText);
    }
    return await response.blob();
}

// Named API groupings for easy access
export const api = {
    documents: {
        list: (params = {}) => {
            const query = new URLSearchParams();
            if (params.startDate) query.set('startDate', params.startDate);
            if (params.endDate) query.set('endDate', params.endDate);
            if (params.branch && params.branch !== 'All') query.set('branch', params.branch);
            const qs = query.toString();
            return fetchApi(`/documents${qs ? '?' + qs : ''}`);
        },
        get: (id) => fetchApi(`/documents/${id}`),
        previewWorkflow: (category, branch, subCategory) => {
            const query = new URLSearchParams({ category, branch });
            if (subCategory) query.set('subCategory', subCategory);
            return fetchApi(`/documents/workflow-preview?${query.toString()}`);
        },
        upload: (formData) => fetch(`${API_BASE_URL}/documents`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        }).then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || res.statusText);
            return data;
        }),
        delete: (id) => fetchApi(`/documents/${id}`, { method: 'DELETE' }),
        getFileBlob: (id) => fetchBlob(`/documents/${id}/file`),
        generate: (payload) => fetchApi('/documents/generate', {
            method: 'POST',
            body: JSON.stringify(payload)
        })
    },

    approvals: {
        pending: (params = {}) => {
            const query = new URLSearchParams();
            if (params.startDate) query.set('startDate', params.startDate);
            if (params.endDate) query.set('endDate', params.endDate);
            if (params.branch && params.branch !== 'All') query.set('branch', params.branch);
            const qs = query.toString();
            return fetchApi(`/approvals/pending${qs ? '?' + qs : ''}`);
        },
        count: (params = {}) => {
            const query = new URLSearchParams();
            if (params.branch && params.branch !== 'All') query.set('branch', params.branch);
            const qs = query.toString();
            return fetchApi(`/approvals/pending/count${qs ? '?' + qs : ''}`);
        },
        completed: () => fetchApi('/approvals/completed'),
        action: (id, actionType, comment) => fetchApi(`/approvals/${id}/action`, {
            method: 'POST',
            body: JSON.stringify({ action: actionType, comment })
        }),
        sync: () => fetchApi('/approvals/sync', { method: 'POST' })
    },

    admin: {
        users: {
            list: () => fetchApi('/admin/users'),
            create: (payload) => fetchApi('/admin/users', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            update: (id, payload) => fetchApi(`/admin/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            }),
            resetPassword: (id, password) => fetchApi(`/admin/users/${id}/reset-password`, {
                method: 'POST',
                body: JSON.stringify({ password })
            }),
            delete: (id) => fetchApi(`/admin/users/${id}`, {
                method: 'DELETE'
            }),
            setDelegation: (id, payload) => fetchApi(`/admin/users/${id}/delegation`, {
                method: 'POST',
                body: JSON.stringify(payload)
            })
        },
        workflows: {
            get: (category) => fetchApi(`/admin/workflows/${category}`),
            save: (payload) => fetchApi('/admin/workflows', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            delete: (id) => fetchApi(`/admin/workflows/${id}`, {
                method: 'DELETE'
            })
        },
        signatures: {
            list: () => fetchApi('/admin/signatures'),
            upload: (formData) => fetch(`${API_BASE_URL}/admin/signatures`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            }).then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || res.statusText);
                return data;
            })
        },
        keywords: {
            list: () => fetchApi('/admin/keywords'),
            add: (payload) => fetchApi('/admin/keywords', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            update: (id, payload) => fetchApi(`/admin/keywords/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            }),
            delete: (id) => fetchApi(`/admin/keywords/${id}`, { method: 'DELETE' })
        },
        roles: {
            list: () => fetchApi('/admin/roles'),
            add: (payload) => fetchApi('/admin/roles', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            delete: (id) => fetchApi(`/admin/roles/${id}`, { method: 'DELETE' })
        },
        categories: {
            list: () => fetchApi('/admin/categories'),
            add: (payload) => fetchApi('/admin/categories', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            delete: (id) => fetchApi(`/admin/categories/${id}`, { method: 'DELETE' })
        },
        departments: {
            list: () => fetchApi('/admin/departments'),
            add: (payload) => fetchApi('/admin/departments', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            update: (id, payload) => fetchApi(`/admin/departments/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            }),
            delete: (id) => fetchApi(`/admin/departments/${id}`, { method: 'DELETE' })
        },
        templates: {
            list: () => fetchApi('/admin/templates'),
            active: () => fetchApi('/admin/templates/active'),
            upload: (formData) => fetch(`${API_BASE_URL}/admin/templates`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            }).then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || res.statusText);
                return data;
            }),
            update: (id, payload) => fetchApi(`/admin/templates/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            }),
            delete: (id) => fetchApi(`/admin/templates/${id}`, { method: 'DELETE' })
        }
    },

    profile: {
        get: () => fetchApi('/profile')
    },

    search: (query) => fetchApi(`/search?q=${encodeURIComponent(query)}`),

    subcategories: {
        list: (category) => fetchApi(`/subcategories?category=${encodeURIComponent(category)}`)
    },

    logs: {
        list: (params = {}) => {
            const query = new URLSearchParams();
            if (params.limit) query.set('limit', params.limit);
            if (params.offset) query.set('offset', params.offset);
            if (params.action) query.set('action', params.action);
            if (params.startDate) query.set('startDate', params.startDate);
            if (params.endDate) query.set('endDate', params.endDate);
            const qs = query.toString();
            return fetchApi(`/logs${qs ? '?' + qs : ''}`);
        }
    }
};
