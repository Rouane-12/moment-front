const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:5200';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage for cross-domain requests
  const token = localStorage.getItem('token');
  console.log('API Request:', endpoint, 'Token exists:', !!token);
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export const api = {
  auth: {
    register: (data: { firstName: string; lastName: string; email?: string; phone?: string; password: string; city?: string }) =>
      request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: { email?: string; phone?: string; password: string }) =>
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    logout: () =>
      request('/api/auth/logout', {
        method: 'POST',
      }),

    getMe: () =>
      request('/api/auth/me'),

    updateMe: (data: any) =>
      request('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    forgotPassword: (data: { email?: string; phone?: string }) =>
      request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    resetPassword: (data: { email?: string; phone?: string; resetCode: string; newPassword: string }) =>
      request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    googleLogin: () => {
      window.location.href = `${import.meta.env['VITE_API_URL']}/api/auth/google`;
    },
  },

  venues: {
    list: (params?: { city?: string; category?: string; search?: string; lat?: number; lng?: number; radius?: number }) =>
      request(`/api/venues${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),

    get: (id: string) =>
      request(`/api/venues/${id}`),

    create: (data: any) =>
      request('/api/venues', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: any) =>
      request(`/api/venues/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request(`/api/venues/${id}`, {
        method: 'DELETE',
      }),

    importFromGoogle: (data: { location: { lat: number; lng: number }; radius: number; type: string }) =>
      request('/api/venues/import/google', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  moments: {
    generate: (data: {
      city: string;
      people: number;
      budget: number;
      when?: string;
      start?: string;
      vibes?: string;
      transport?: string;
      roll: number;
      date?: string;
    }) =>
      request('/api/moments/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    get: (id: string) =>
      request(`/api/moments/${id}`),

    list: (params?: { status?: string }) =>
      request(`/api/moments${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  },

  bookings: {
    create: (data: { itineraryId: string; notes?: string }) =>
      request('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    get: (id: string) =>
      request(`/api/bookings/${id}`),

    initiatePayment: (id: string, data: { phone?: string; email?: string }) =>
      request(`/api/bookings/${id}/payment`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    verifyPayment: (id: string, data: { transactionId: string }) =>
      request(`/api/bookings/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  events: {
    list: (params?: { city?: string; category?: string; startDate?: string; endDate?: string; status?: string }) =>
      request(`/api/events${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),

    get: (id: string) =>
      request(`/api/events/${id}`),

    create: (data: any) =>
      request('/api/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: any) =>
      request(`/api/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  partners: {
    register: (data: any) =>
      request('/api/partners/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getDashboard: () =>
      request('/api/partners/dashboard'),

    list: (params?: { status?: string; city?: string }) =>
      request(`/api/partners${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),

    updateStatus: (id: string, status: string) =>
      request(`/api/partners/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),

    getRequests: () =>
      request('/api/venue-requests/my-requests'),

    createRequest: (data: any) =>
      request('/api/venue-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    processPayment: (requestId: string, transactionId: string) =>
      request(`/api/venue-requests/${requestId}/payment`, {
        method: 'POST',
        body: JSON.stringify({ transactionId }),
      }),
  },

  users: {
    list: (params?: { role?: string; city?: string; isActive?: string }) =>
      request(`/api/users${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),

    get: (id: string) =>
      request(`/api/users/${id}`),

    update: (id: string, data: any) =>
      request(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request(`/api/users/${id}`, {
        method: 'DELETE',
      }),
  },

  admin: {
    getStats: () =>
      request('/api/admin/stats'),

    getBookings: (params?: { status?: string; startDate?: string; endDate?: string }) =>
      request(`/api/admin/bookings${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),

    getCommissions: (params?: { status?: string; partnerId?: string }) =>
      request(`/api/admin/commissions${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),

    createPayout: (data: { partnerId: string; amount: number; method: string; destination: string }) =>
      request('/api/admin/payouts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getPayouts: (params?: { status?: string }) =>
      request(`/api/admin/payouts${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),

    getVenueRequests: (params?: string) =>
      request(`/api/venue-requests${params}`),

    approveVenueRequest: (id: string, paymentAmount?: number) =>
      request(`/api/venue-requests/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ paymentAmount }),
      }),

    rejectVenueRequest: (id: string, reason: string) =>
      request(`/api/venue-requests/${id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
      }),

    processVenueRequestPayment: (id: string, paymentReference: string) =>
      request(`/api/venue-requests/${id}/process-payment`, {
        method: 'POST',
        body: JSON.stringify({ paymentReference }),
      }),

    createVenueFromRequest: (id: string) =>
      request(`/api/venue-requests/${id}/create-venue`, {
        method: 'POST',
      }),

    getReports: (params?: string) =>
      request(`/api/reports${params}`),

    getReportStats: () =>
      request('/api/reports/stats/overview'),

    updateReportStatus: (id: string, data: { status: string; adminNotes?: string }) =>
      request(`/api/reports/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  guest: {
    check: (fingerprint: string) =>
      request('/api/guest/check', {
        method: 'POST',
        body: JSON.stringify({ fingerprint }),
      }),

    increment: (fingerprint: string) =>
      request('/api/guest/increment', {
        method: 'POST',
        body: JSON.stringify({ fingerprint }),
      }),
  },

  chat: {
    getConversations: () =>
      request('/api/chat/conversations'),

    getMessages: (conversationId: string) =>
      request(`/api/chat/messages/${conversationId}`),

    send: (receiverId: string, content: string, extra?: { attachments?: any[] }) =>
      request('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({ receiverId, content, ...extra }),
      }),

    markRead: (conversationId: string) =>
      request(`/api/chat/read/${conversationId}`, {
        method: 'POST',
      }),

    generateQR: () =>
      request('/api/chat/qr/generate', {
        method: 'POST',
      }),

    scanQR: (token: string) =>
      request('/api/chat/qr/scan', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),

    getAdminInfo: () =>
      request('/api/chat/admin-info'),

    editMessage: (messageId: string, content: string) =>
      request(`/api/chat/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),

    deleteMessage: (messageId: string) =>
      request(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
      }),
  },

  reports: {
    create: (data: { venueId?: string; reviewId?: string; type: string; category: string; description: string }) =>
      request('/api/reports', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};

export default api;
