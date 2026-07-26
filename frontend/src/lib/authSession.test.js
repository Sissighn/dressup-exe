import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTH_STORAGE_KEY,
  authFetch,
  assetFetch,
  clearScopedUserLocalData,
  getAuthSession,
  getScopedItem,
  getSessionScope,
  removeScopedItem,
  scopedStorageKey,
  setScopedItem,
} from "./authSession";

describe("authSession utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reads sessions and builds stable scoped storage keys", () => {
    const session = { user: { email: "seta@example.com", role: "user" } };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));

    expect(getAuthSession()).toEqual(session);
    expect(getSessionScope(session)).toBe("user:seta@example.com");
    expect(scopedStorageKey("userAvatar", session)).toBe(
      "dressup:user:seta@example.com:userAvatar",
    );
  });

  it("migrates legacy localStorage values into the active scope", () => {
    const session = { user: { email: "guest@local", role: "guest" } };
    localStorage.setItem("userAvatar", "legacy-avatar.png");

    expect(getScopedItem("userAvatar", session)).toBe("legacy-avatar.png");
    expect(localStorage.getItem("userAvatar")).toBeNull();
    expect(localStorage.getItem(scopedStorageKey("userAvatar", session))).toBe(
      "legacy-avatar.png",
    );
  });

  it("sets, removes, and clears scoped user values", () => {
    const session = { user: { email: "seta@example.com", role: "user" } };

    setScopedItem("selectedTop", "1", session);
    expect(getScopedItem("selectedTop", session)).toBe("1");

    removeScopedItem("selectedTop", session);
    expect(getScopedItem("selectedTop", session)).toBeNull();

    setScopedItem("selectedBottom", "2", session);
    clearScopedUserLocalData(session);
    expect(getScopedItem("selectedBottom", session)).toBeNull();
  });

  it("sends credentialed API and asset requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({}) });

    await authFetch("/closet", { headers: { "X-Test": "1" } });
    await assetFetch("http://testserver/uploads/item.png");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/closet",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://testserver/uploads/item.png",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
