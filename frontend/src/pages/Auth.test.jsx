import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import Auth from "./Auth";

describe("Auth flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("continues as guest and reports the authenticated user", async () => {
    const user = userEvent.setup();
    const onAuthSuccess = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ user: { email: "guest@local", role: "guest" } }),
    });

    render(<Auth onAuthSuccess={onAuthSuccess} />);

    await user.click(screen.getByRole("button", { name: /continue as guest/i }));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/auth/guest",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(onAuthSuccess).toHaveBeenCalledWith({
      user: { email: "guest@local", role: "guest" },
    });
  });

  it("keeps register submit disabled until password rules are satisfied", async () => {
    const user = userEvent.setup();

    render(<Auth onAuthSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /register/i }));
    const submitButton = screen.getByRole("button", { name: /create account/i });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText(/email/i), "seta@example.com");
    await user.type(screen.getByLabelText(/password/i), "StrongPass123!");

    expect(submitButton).toBeEnabled();
  });
});
