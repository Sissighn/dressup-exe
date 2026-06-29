export const AUTH_STORAGE_KEY = "dressupAuthSession";
export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

export const USER_LOCAL_KEYS = [
  "userBiometrics",
  "userAvatar",
  "userProfileImage",
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

export const getSessionScope = (session = getAuthSession()) => {
  const role = session?.user?.role || "user";
  const subject = session?.user?.email || "anonymous";
  return `${role}:${subject}`;
};

export const scopedStorageKey = (key, session = getAuthSession()) =>
  `dressup:${getSessionScope(session)}:${key}`;

export const getScopedItem = (key, session = getAuthSession()) => {
  const scopedKey = scopedStorageKey(key, session);
  const scopedValue = localStorage.getItem(scopedKey);
  if (scopedValue !== null) {
    return scopedValue;
  }

  // One-time migration from legacy global keys
  const legacyValue = localStorage.getItem(key);
  if (legacyValue !== null) {
    localStorage.setItem(scopedKey, legacyValue);
    localStorage.removeItem(key);
    return legacyValue;
  }

  return null;
};

export const setScopedItem = (key, value, session = getAuthSession()) =>
  localStorage.setItem(scopedStorageKey(key, session), value);

export const removeScopedItem = (key, session = getAuthSession()) =>
  localStorage.removeItem(scopedStorageKey(key, session));

export const clearScopedUserLocalData = (session = getAuthSession()) => {
  USER_LOCAL_KEYS.forEach((key) => removeScopedItem(key, session));
};

export const authFetch = (path, options = {}) => {
  const headers = new Headers(options.headers || {});

  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
};

export const assetFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    credentials: "include",
  });
