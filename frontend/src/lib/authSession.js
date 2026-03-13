export const AUTH_STORAGE_KEY = "dressupAuthSession";
export const API_BASE = "http://localhost:8000";

export const USER_LOCAL_KEYS = [
  "userBiometrics",
  "userAvatar",
  "userName",
  "selectedTop",
  "selectedBottom",
  "dressedAvatar",
];

export const getAuthSession = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const decodeTokenPayload = (token) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

export const getSessionScope = (session = getAuthSession()) => {
  const role = session?.user?.role || "user";
  const payload = decodeTokenPayload(session?.token || "");
  const subject = payload?.sub || session?.user?.email || "anonymous";
  return `${role}:${subject}`;
};

export const scopedStorageKey = (key, session = getAuthSession()) =>
  `dressup:${getSessionScope(session)}:${key}`;

export const getScopedItem = (key, session = getAuthSession()) =>
  localStorage.getItem(scopedStorageKey(key, session));

export const setScopedItem = (key, value, session = getAuthSession()) =>
  localStorage.setItem(scopedStorageKey(key, session), value);

export const removeScopedItem = (key, session = getAuthSession()) =>
  localStorage.removeItem(scopedStorageKey(key, session));

export const clearScopedUserLocalData = (session = getAuthSession()) => {
  USER_LOCAL_KEYS.forEach((key) => removeScopedItem(key, session));
};

export const authFetch = (path, options = {}) => {
  const session = getAuthSession();
  const token = session?.token;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
};
