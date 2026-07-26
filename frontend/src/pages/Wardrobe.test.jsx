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
];

const renderWardrobe = () =>
  render(
    <MemoryRouter>
      <Wardrobe />
    </MemoryRouter>,
  );

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
