import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import UploadModal from "./UploadModal";

describe("UploadModal", () => {
  it("shows upload context and confirms the selected category", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <UploadModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        previewImage="blob:test-preview"
        initialCategory="TOPS"
        currentFileName="linen-top.png"
        currentStep={1}
        totalSteps={2}
      />,
    );

    expect(screen.getByText("ITEM 1 / 2")).toBeInTheDocument();
    expect(screen.getByText("linen-top.png")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/category/i), "BOTTOMS");
    await user.click(screen.getByRole("button", { name: /upload to closet/i }));

    expect(onConfirm).toHaveBeenCalledWith("BOTTOMS");
  });

  it("does not render when closed", () => {
    render(
      <UploadModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        previewImage=""
        initialCategory="TOPS"
        currentFileName=""
        currentStep={1}
        totalSteps={1}
      />,
    );

    expect(screen.queryByText(/confirm asset/i)).not.toBeInTheDocument();
  });
});
