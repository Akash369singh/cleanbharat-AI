const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('cleanbharat_token');
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      let errorData = null;
      try {
        errorData = await response.json();
        if (errorData?.detail) {
          errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // Response is not json
      }
      throw new ApiError(response.status, errorMsg, errorData);
    }

    // Check if response is empty (e.g. 204)
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(0, err?.message || 'Network connection failed. Please ensure the backend is running.');
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options: RequestInit = {}) =>
    apiFetch<T>(endpoint, { method: 'GET', ...options }).then((data) => ({ data })),
  post: <T = any>(endpoint: string, body?: any, options: RequestInit = {}) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }).then((data) => ({ data })),
};

export const api = {
  // Health
  getHealth: (signal?: AbortSignal) => apiFetch<any>('/health', { signal }),
  // Auth
  login: (email: string, password: string) =>
    apiFetch<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => apiFetch<any>('/auth/me'),

  // Wards
  getWards: () => apiFetch<any[]>('/wards'),

  // Reports
  getReports: (params: { status?: string; category?: string; ward_id?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.category) q.append('category', params.category);
    if (params.ward_id) q.append('ward_id', String(params.ward_id));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any[]>(`/reports${qs}`);
  },
  getMyReports: () => apiFetch<any[]>('/reports/my'),
  getReport: (id: number) => apiFetch<any>(`/reports/${id}`),
  createReport: (data: any) =>
    apiFetch<any>('/reports', { method: 'POST', body: JSON.stringify(data) }),
  uploadPhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<{ photo_path: string; status: string }>('/reports/upload', {
      method: 'POST',
      body: formData
    });
  },
  updateReportStatus: (id: number, new_status: string, comment?: string) =>
    apiFetch<any>(`/reports/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ new_status, comment })
    }),
  getReportEvents: (id: number) => apiFetch<any[]>(`/reports/${id}/events`),

  // Routing
  getDepots: () => apiFetch<any[]>('/routing/depots'),
  getVehicles: () => apiFetch<any[]>('/routing/vehicles'),
  getRoutes: () => apiFetch<any[]>('/routing/routes'),
  getRoute: (id: number) => apiFetch<any>(`/routing/routes/${id}`),
  optimizeRoute: (depot_id: number, vehicle_id: number, report_ids: number[]) =>
    apiFetch<any>('/routing/optimize', {
      method: 'POST',
      body: JSON.stringify({ depot_id, vehicle_id, report_ids })
    }),

  // Resolution
  submitEvidence: (report_id: number, after_photo_path: string, notes?: string) =>
    apiFetch<any>('/resolution/submit', {
      method: 'POST',
      body: JSON.stringify({ report_id, after_photo_path, notes })
    }),
  getResolutionQueue: () => apiFetch<any[]>('/resolution/queue'),
  reviewEvidence: (evidence_id: number, decision: 'approved' | 'rejected', notes?: string, rejection_reason?: string) =>
    apiFetch<any>(`/resolution/${evidence_id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes, rejection_reason })
    }),

  // DrainGuard
  getDrainHotspots: () => apiFetch<any>('/drains/hotspots'),
  getDrainInspections: () => apiFetch<any[]>('/drains/inspections'),

  // IoT
  getBins: () => apiFetch<any[]>('/iot/bins'),
  simulateBins: (bin_id?: number) =>
    apiFetch<any>(`/iot/simulate${bin_id ? `?bin_id=${bin_id}` : ''}`, { method: 'POST' }),

  // Recycling
  getRateCard: () => apiFetch<any>('/recycling/rate-card'),
  getListings: () => apiFetch<any[]>('/recycling/listings'),
  createListing: (data: any) =>
    apiFetch<any>('/recycling/listings', { method: 'POST', body: JSON.stringify(data) }),
  getRecyclers: () => apiFetch<any[]>('/recycling/recyclers'),
  createPickup: (data: any) =>
    apiFetch<any>('/recycling/pickups', { method: 'POST', body: JSON.stringify(data) }),

  // Engagement
  getQuiz: () => apiFetch<any[]>('/engagement/quiz'),
  submitQuiz: (question_id: number, selected_option_index: number) =>
    apiFetch<any>('/engagement/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ question_id, selected_option_index })
    }),
  getEvents: () => apiFetch<any[]>('/engagement/events'),
  volunteerForEvent: (event_id: number, task_id?: number) =>
    apiFetch<any>(`/engagement/events/${event_id}/volunteer`, {
      method: 'POST',
      body: JSON.stringify({ task_id })
    }),
  getLeaderboard: () => apiFetch<any[]>('/engagement/leaderboard'),

  // Metrics & Command Centre
  getCommandCenter: () => apiFetch<any>('/metrics/command-center'),
  getKpiSummary: () => apiFetch<any>('/metrics/kpi-summary'),
  getAnalyticsSeries: (days: number = 30) => apiFetch<any>(`/metrics/analytics-series?days=${days}`),
  getActivityFeed: (limit: number = 25) => apiFetch<any[]>(`/metrics/activity-feed?limit=${limit}`),
  getNotifications: () => apiFetch<any>('/metrics/notifications'),
  globalSearch: (q: string) => apiFetch<any>(`/metrics/search?q=${encodeURIComponent(q)}`),
  getWardsGeojson: () => apiFetch<any>('/metrics/wards-geojson'),
  getImpact: () => apiFetch<any>('/metrics/impact'),
  getCsvExportUrl: () => `${API_BASE_URL}/metrics/export-reports-csv`,
  getChartCsvExportUrl: (chartId: string) => `${API_BASE_URL}/metrics/export-chart-csv/${chartId}`,

  // Assistant
  askAssistant: (query: string) =>
    apiFetch<any>('/assistant/query', { method: 'POST', body: JSON.stringify({ query }) }),

  // Admin
  getConfigs: () => apiFetch<any[]>('/admin/config'),
  updateConfig: (key: string, value_json: any) =>
    apiFetch<any>('/admin/config', { method: 'PUT', body: JSON.stringify({ key, value_json }) }),
  seedData: () => apiFetch<any>('/admin/seed', { method: 'POST' }),
  resetData: (admin_confirmed: boolean) =>
    apiFetch<any>('/admin/reset', { method: 'POST', body: JSON.stringify({ admin_confirmed }) })
};
