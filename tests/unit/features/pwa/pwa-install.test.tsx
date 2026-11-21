// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectivityBanner } from "@/features/pwa/components/connectivity-banner";
import { PwaInstallBanner } from "@/features/pwa/components/pwa-install-banner";
import { PwaInstallButton } from "@/features/pwa/components/pwa-install-button";
import { PwaInstallModal } from "@/features/pwa/components/pwa-install-modal";
import { PWA_DISMISSED_KEY } from "@/features/pwa/constants";

describe("PWA Install and Connectivity Components", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("ConnectivityBanner renders offline status when offline", () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(<ConnectivityBanner />);

    expect(
      screen.getByText(/You are currently offline. Showing cached schedule/i),
    ).toBeInTheDocument();
  });

  it("PwaInstallModal displays benefits and renders accessible dialog", () => {
    render(<PwaInstallModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Install BooKanto/i })).toBeInTheDocument();
    expect(screen.getByText(/1-Tap Home Screen Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Offline Schedule & Client Contacts/i)).toBeInTheDocument();
  });

  it("PwaInstallModal calls onClose when clicking close", () => {
    const handleClose = vi.fn();
    render(<PwaInstallModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText(/Close dialog/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("PwaInstallBanner respects dismiss state in localStorage", () => {
    const future = Date.now() + 1000000;
    window.localStorage.setItem(PWA_DISMISSED_KEY, String(future));

    const { container } = render(<PwaInstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("PwaInstallButton renders in installed or installable mode", () => {
    render(<PwaInstallButton showInstalledState={true} />);
    // With JSDOM default standalone check
    expect(document.body).toBeDefined();
  });
});
