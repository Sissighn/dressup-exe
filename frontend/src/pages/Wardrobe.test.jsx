import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Wardrobe from "./Wardrobe";

const authSessionMock = vi.hoisted(() => ({
  authFetch: vi.fn(),
  assetFetch: vi.fn(),
  getAuthSession: vi.fn(() => ({ user: { email: "guest@local", role: "guest" } })),
  getScopedItem: vi.fn(),
  setScopedItem: vi.fn(),
  removeScopedItem: vi.fn(),
}));

vi.mock("../lib/authSession", () => authSessionMock);

const closetItems = [
  {
    id: 1,
    name: "White Top",
    category: "TOPS",
    image_path: "http://testserver/uploads/top.png",
  },
  {
    id: 2,
    name: "Black Skirt",
    category: "BOTTOMS",
    image_path: "http://testserver/uploads/bottom.png",
  },
  {
    id: 3,
    name: "Red Dress",
    category: "DRESSES",
    image_path: "http://testserver/uploads/dress.png",
  },
];

const renderWardrobe = () =>
  render(
    <MemoryRouter>
      <Wardrobe />
    </MemoryRouter>,
  );

/** Bringt die Seite in den Zustand "Look fertig generiert". */
const generateLook = async (user, { archiveOk = true } = {}) => {
  authSessionMock.getScopedItem.mockImplementation((key) =>
    key === "userAvatar" ? "http://testserver/uploads/avatar.png" : null,
  );
  authSessionMock.assetFetch.mockResolvedValue({
    ok: true,
    blob: async () => new Blob(["image"], { type: "image/png" }),
  });
  authSessionMock.authFetch.mockImplementation(async (path) => {
    if (path === "/closet") {
      return { ok: true, json: async () => closetItems };
    }
    if (path === "/try-on-outfit") {
      return {
        ok: true,
        json: async () => ({ outfit_url: "http://testserver/uploads/outfit.png" }),
      };
    }
    if (path === "/archive-look") {
      return { ok: archiveOk, json: async () => ({}) };
    }
    return { ok: false, json: async () => ({ detail: "Unexpected route" }) };
  });

  renderWardrobe();

  const selectButtons = await screen.findAllByRole("button", { name: "SELECT" });
  await user.click(selectButtons[0]);
  await user.click(selectButtons[1]);
  await user.click(screen.getByRole("button", { name: /try the combi on/i }));

  await screen.findByText("LOOK READY");
};

describe("Wardrobe states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSessionMock.authFetch.mockResolvedValue({
      ok: true,
      json: async () => closetItems,
    });
    authSessionMock.getScopedItem.mockReturnValue(null);
  });

  it("keeps try-on disabled without a model and shows the next step", async () => {
    renderWardrobe();

    expect(
      await screen.findByRole("button", { name: /create model/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try the combi on/i })).toBeDisabled();
  });

  it("enables try-on after model, top, and bottom are selected", async () => {
    const user = userEvent.setup();
    authSessionMock.getScopedItem.mockImplementation((key) =>
      key === "userAvatar" ? "http://testserver/uploads/avatar.png" : null,
    );

    renderWardrobe();

    const selectButtons = await screen.findAllByRole("button", { name: "SELECT" });
    await user.click(selectButtons[0]);
    await user.click(selectButtons[1]);

    expect(screen.getByRole("button", { name: /try the combi on/i })).toBeEnabled();
  });

  it("generates a look after required assets are selected", async () => {
    const user = userEvent.setup();
    authSessionMock.getScopedItem.mockImplementation((key) =>
      key === "userAvatar" ? "http://testserver/uploads/avatar.png" : null,
    );
    authSessionMock.assetFetch.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["image"], { type: "image/png" }),
    });
    authSessionMock.authFetch.mockImplementation(async (path) => {
      if (path === "/closet") {
        return { ok: true, json: async () => closetItems };
      }
      if (path === "/try-on-outfit") {
        return {
          ok: true,
          json: async () => ({
            outfit_url: "http://testserver/uploads/outfit.png",
          }),
        };
      }
      return { ok: false, json: async () => ({ detail: "Unexpected route" }) };
    });

    renderWardrobe();

    const selectButtons = await screen.findAllByRole("button", { name: "SELECT" });
    await user.click(selectButtons[0]);
    await user.click(selectButtons[1]);
    await user.click(screen.getByRole("button", { name: /try the combi on/i }));

    expect(await screen.findByText("LOOK READY")).toBeInTheDocument();
    expect(authSessionMock.assetFetch).toHaveBeenCalledTimes(3);
    expect(authSessionMock.authFetch).toHaveBeenCalledWith(
      "/try-on-outfit",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );
  });

  it("switches to dress mode and generates from a single dress", async () => {
    const user = userEvent.setup();
    authSessionMock.getScopedItem.mockImplementation((key) =>
      key === "userAvatar" ? "http://testserver/uploads/avatar.png" : null,
    );
    authSessionMock.assetFetch.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["image"], { type: "image/png" }),
    });
    authSessionMock.authFetch.mockImplementation(async (path) => {
      if (path === "/closet") {
        return { ok: true, json: async () => closetItems };
      }
      if (path === "/try-on-outfit") {
        return {
          ok: true,
          json: async () => ({
            outfit_url: "http://testserver/uploads/outfit.png",
          }),
        };
      }
      return { ok: false, json: async () => ({ detail: "Unexpected route" }) };
    });

    renderWardrobe();

    await user.click(await screen.findByRole("button", { name: "DRESS" }));

    // Nur noch die Kleid-Auswahl ist sichtbar, Top/Bottom sind ausgeblendet.
    expect(screen.getByText("DRESSES")).toBeInTheDocument();
    expect(screen.queryByText("TOPS")).not.toBeInTheDocument();
    expect(screen.queryByText("BOTTOMS")).not.toBeInTheDocument();

    const tryOnButton = screen.getByRole("button", { name: /try the dress on/i });
    expect(tryOnButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "SELECT" }));
    expect(tryOnButton).toBeEnabled();

    await user.click(tryOnButton);

    expect(await screen.findByText("LOOK READY")).toBeInTheDocument();
    // Avatar + Kleid, nicht Avatar + Top + Bottom.
    expect(authSessionMock.assetFetch).toHaveBeenCalledTimes(2);

    const [, options] = authSessionMock.authFetch.mock.calls.find(
      ([path]) => path === "/try-on-outfit",
    );
    expect(options.body.get("dress_image")).toBeInstanceOf(Blob);
    expect(options.body.get("top_image")).toBeNull();
    expect(options.body.get("bottom_image")).toBeNull();
  });

  it("archives a generated look and confirms it in the dialog", async () => {
    const user = userEvent.setup();
    await generateLook(user);

    await user.click(screen.getByRole("button", { name: /archive look/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("ARCHIVE CONFIRMED");
    const [, options] = authSessionMock.authFetch.mock.calls.find(
      ([path]) => path === "/archive-look",
    );
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body).outfit_url).toContain("/uploads/outfit.png");

    await user.click(screen.getByRole("button", { name: /^ok$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reports a failed archive without closing on its own", async () => {
    const user = userEvent.setup();
    await generateLook(user, { archiveOk: false });

    await user.click(screen.getByRole("button", { name: /archive look/i }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("ARCHIVE FAILED");
  });

  it("clears the generated look and all selections on reset", async () => {
    const user = userEvent.setup();
    await generateLook(user);

    await user.click(screen.getByRole("button", { name: /reset to original/i }));

    // Ohne Look verschwinden die Folge-Aktionen, die Auswahl beginnt von vorn.
    expect(
      screen.queryByRole("button", { name: /archive look/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save look/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try the combi on/i })).toBeDisabled();
  });

  it("shows the dress empty state when no dress is in the closet", async () => {
    const user = userEvent.setup();
    authSessionMock.authFetch.mockResolvedValue({
      ok: true,
      json: async () => closetItems.filter((item) => item.category !== "DRESSES"),
    });

    renderWardrobe();

    await user.click(await screen.findByRole("button", { name: "DRESS" }));

    expect(
      screen.getByRole("button", { name: /upload first dress/i }),
    ).toBeInTheDocument();
  });

  it("shows concrete empty actions when closet categories are empty", async () => {
    authSessionMock.authFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    renderWardrobe();

    expect(await screen.findByRole("button", { name: /upload first top/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add bottom item/i })).toBeInTheDocument();
  });
});
