import { getAuthItem } from './utils/authStorage';

const getToken = () => getAuthItem('authToken');

const request = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    headers,
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};

export const api = {
  login: (login, password) => request('/api/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  register: (username, email, password) => request('/api/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  profile: (id) => request(`/api/profile/${id}`),
  activateKey: (code) => request('/api/keys/activate', { method: 'POST', body: JSON.stringify({ code }) }),
  generateKeys: (role, days, count) => request('/api/keys/generate', { method: 'POST', body: JSON.stringify({ role, days, count }) }),
  listKeys: () => request('/api/admin/keys'),
  clearKeys: () => request('/api/admin/keys/clear', { method: 'POST', body: JSON.stringify({}) }),
  listUsers: (role) => request(`/api/admin/users${role ? `?role=${role}` : ''}`),
  stats: () => request('/api/admin/stats'),
  listJournal: () => request('/api/admin/journal'),
  clearJournal: () => request('/api/admin/journal/clear', { method: 'POST', body: JSON.stringify({}) }),
  banUser: (userId, banned) => request('/api/admin/ban', { method: 'POST', body: JSON.stringify({ userId, banned }) }),
  setRole: (userId, role) => request('/api/admin/role', { method: 'POST', body: JSON.stringify({ userId, role }) }),
  removeSubscription: (userId) => request('/api/admin/subscription/remove', { method: 'POST', body: JSON.stringify({ userId }) }),
  resetPassword: (userId) => request('/api/admin/reset-password', { method: 'POST', body: JSON.stringify({ userId }) }),
  resetHwid: (userId) => request('/api/admin/reset-hwid', { method: 'POST', body: JSON.stringify({ userId }) }),
  listTickets: () => request('/api/tickets'),
  listAdminTickets: () => request('/api/admin/tickets'),
  createTicket: (title) => request('/api/tickets', { method: 'POST', body: JSON.stringify({ title }) }),
  listMessages: (ticketId) => request(`/api/tickets/${ticketId}/messages`),
  sendMessage: (ticketId, text, attachments) => request(`/api/tickets/${ticketId}/message`, { method: 'POST', body: JSON.stringify({ text, attachments }) }),
  closeTicket: (ticketId) => request(`/api/tickets/${ticketId}/close`, { method: 'POST', body: JSON.stringify({}) }),
  clearTickets: () => request('/api/admin/tickets/clear', { method: 'POST', body: JSON.stringify({}) }),
  check2FA: (sessionId) => request('/api/2fa/check', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  get2FAStatus: () => request('/api/2fa/status'),
  generate2FALink: () => request('/api/2fa/generate-link', { method: 'POST', body: JSON.stringify({}) }),
  unlink2FA: () => request('/api/2fa/unlink', { method: 'POST', body: JSON.stringify({}) }),
  toggle2FA: (enabled) => request('/api/2fa/toggle', { method: 'POST', body: JSON.stringify({ enabled }) }),
  get2FAHistory: () => request('/api/2fa/history'),
};
