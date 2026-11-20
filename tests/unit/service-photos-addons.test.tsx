// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addServicePhoto,
  createServiceAddon,
  deleteServiceAddon,
  removeServicePhoto,
  updateServiceAddon,
} from "@/features/services/actions";
import {
  ServicePhotosAddons,
  type ServiceOption,
} from "@/features/services/components/service-photos-addons";
import { ServicesManager } from "@/features/services/components/services-manager";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));

vi.mock("@/features/services/actions", () => ({
  addServicePhoto: vi.fn(),
  removeServicePhoto: vi.fn(),
  createServiceAddon: vi.fn(),
  updateServiceAddon: vi.fn(),
  deleteServiceAddon: vi.fn(),
}));

const shopId = "11111111-1111-1111-1111-111111111111";

const mockServices: ServiceOption[] = [
  {
    id: "srv-1",
    name: "Classic Haircut",
    photos: [
      { id: "photo-1", path: "services/srv-1/photo1.jpg", sortOrder: 0 },
      { id: "photo-2", path: "services/srv-1/photo2.jpg", sortOrder: 1 },
    ],
    addons: [
      {
        id: "addon-1",
        serviceId: "srv-1",
        name: "Hair Spa",
        description: "Relaxing hair spa",
        priceCentavos: 15000,
        durationMin: 15,
        active: true,
      },
    ],
  },
  {
    id: "srv-2",
    name: "Beard Trim",
    photos: [],
    addons: [],
  },
];

describe("ServicePhotosAddons", () => {
  const originalLocation = window.location;
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    reloadMock = vi.fn();
    delete (window as unknown as { location: unknown }).location;
    (window as unknown as { location: unknown }).location = {
      ...originalLocation,
      reload: reloadMock,
    };
  });

  afterEach(() => {
    cleanup();
    (window as unknown as { location: unknown }).location = originalLocation;
  });

  it("renders services, photos, and add-ons without refreshing", () => {
    render(<ServicePhotosAddons shopId={shopId} services={mockServices} />);

    expect(screen.getByText(/Classic Haircut \(2 photos, 1 add-ons\)/)).toBeInTheDocument();
    expect(screen.getByText("Service Photos")).toBeInTheDocument();
    expect(screen.getByText("Service Add-ons")).toBeInTheDocument();
    expect(screen.getByText("Hair Spa")).toBeInTheDocument();
    expect(screen.getAllByAltText("Service photo")).toHaveLength(2);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("adds a photo without refreshing the page", async () => {
    const onUpdateService = vi.fn();
    vi.mocked(addServicePhoto).mockResolvedValue({
      ok: true,
      data: { mediaId: "photo-3", path: "services/srv-1/photo3.jpg" },
    });

    // Mock FileReader
    const originalFileReader = globalThis.FileReader;
    class MockFileReader {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      result: string = "data:image/jpeg;base64,mockbase64data";
      readAsDataURL() {
        setTimeout(() => this.onload?.(), 10);
      }
    }
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;

    try {
      render(
        <ServicePhotosAddons
          shopId={shopId}
          services={mockServices}
          onUpdateService={onUpdateService}
        />,
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      const fakeFile = new File(["dummy content"], "haircut.jpg", { type: "image/jpeg" });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [fakeFile] } });
      });

      await waitFor(() => {
        expect(addServicePhoto).toHaveBeenCalledWith({
          serviceId: "srv-1",
          shopId,
          imageBase64: "mockbase64data",
          sortOrder: 2,
        });
      });

      // Verification:
      // 1. Photo added to the DOM
      expect(screen.getAllByAltText("Service photo")).toHaveLength(3);
      // 2. onUpdateService called with new photo
      expect(onUpdateService).toHaveBeenCalledWith("srv-1", expect.any(Function));
      // 3. Router refresh called in background
      expect(mockRefresh).toHaveBeenCalled();
      // 4. Page was NEVER reloaded
      expect(reloadMock).not.toHaveBeenCalled();
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });

  it("deletes a photo without refreshing the page", async () => {
    const onUpdateService = vi.fn();
    vi.mocked(removeServicePhoto).mockResolvedValue({
      ok: true,
      data: { success: true },
    });

    render(
      <ServicePhotosAddons
        shopId={shopId}
        services={mockServices}
        onUpdateService={onUpdateService}
      />,
    );

    expect(screen.getAllByAltText("Service photo")).toHaveLength(2);

    const deletePhotoBtns = screen.getAllByTitle("Delete photo");
    await act(async () => {
      fireEvent.click(deletePhotoBtns[0]!);
    });

    expect(removeServicePhoto).toHaveBeenCalledWith({
      serviceId: "srv-1",
      shopId,
      mediaId: "photo-1",
    });

    // Verification:
    // 1. One photo remains in DOM
    expect(screen.getAllByAltText("Service photo")).toHaveLength(1);
    // 2. onUpdateService callback called
    expect(onUpdateService).toHaveBeenCalledWith("srv-1", expect.any(Function));
    // 3. Background router.refresh called
    expect(mockRefresh).toHaveBeenCalled();
    // 4. Page was NEVER reloaded
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("creates an add-on without refreshing the page", async () => {
    const onUpdateService = vi.fn();
    vi.mocked(createServiceAddon).mockResolvedValue({
      ok: true,
      data: { addonId: "addon-2" },
    });

    render(
      <ServicePhotosAddons
        shopId={shopId}
        services={mockServices}
        onUpdateService={onUpdateService}
      />,
    );

    // Open add-on form
    fireEvent.click(screen.getByRole("button", { name: /New Add-on/ }));

    const nameInput = screen.getByPlaceholderText(/Add-on Name/);
    fireEvent.change(nameInput, { target: { value: "Scalp Massage" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save Add-on" }));
    });

    expect(createServiceAddon).toHaveBeenCalledWith({
      serviceId: "srv-1",
      shopId,
      name: "Scalp Massage",
      description: null,
      priceCentavos: 5000,
      durationMin: 10,
      active: true,
    });

    // Verification:
    // 1. New add-on is in the DOM
    expect(screen.getByText("Scalp Massage")).toBeInTheDocument();
    // 2. onUpdateService callback called
    expect(onUpdateService).toHaveBeenCalledWith("srv-1", expect.any(Function));
    // 3. Background router.refresh called
    expect(mockRefresh).toHaveBeenCalled();
    // 4. Page was NEVER reloaded
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("deletes an add-on without refreshing the page", async () => {
    const onUpdateService = vi.fn();
    vi.mocked(deleteServiceAddon).mockResolvedValue({
      ok: true,
      data: { success: true },
    });

    render(
      <ServicePhotosAddons
        shopId={shopId}
        services={mockServices}
        onUpdateService={onUpdateService}
      />,
    );

    expect(screen.getByText("Hair Spa")).toBeInTheDocument();

    const deleteAddonBtn = screen.getByTitle("Delete add-on");
    await act(async () => {
      fireEvent.click(deleteAddonBtn);
    });

    expect(deleteServiceAddon).toHaveBeenCalledWith({
      addonId: "addon-1",
      shopId,
    });

    // Verification:
    // 1. Add-on removed from DOM
    expect(screen.queryByText("Hair Spa")).not.toBeInTheDocument();
    // 2. Empty state shows
    expect(screen.getByText(/No add-ons configured/)).toBeInTheDocument();
    // 3. onUpdateService called
    expect(onUpdateService).toHaveBeenCalledWith("srv-1", expect.any(Function));
    // 4. Background router.refresh called
    expect(mockRefresh).toHaveBeenCalled();
    // 5. Page was NEVER reloaded
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("toggles an add-on active state without refreshing the page", async () => {
    const onUpdateService = vi.fn();
    vi.mocked(updateServiceAddon).mockResolvedValue({
      ok: true,
      data: { success: true },
    });

    render(
      <ServicePhotosAddons
        shopId={shopId}
        services={mockServices}
        onUpdateService={onUpdateService}
      />,
    );

    const toggleBtn = screen.getByRole("button", { name: "Active" });
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(updateServiceAddon).toHaveBeenCalledWith({
      addonId: "addon-1",
      shopId,
      name: "Hair Spa",
      priceCentavos: 15000,
      durationMin: 15,
      active: false,
    });

    // Verification:
    // 1. Badge changed to Off
    expect(screen.getByRole("button", { name: "Off" })).toBeInTheDocument();
    // 2. Page was NEVER reloaded
    expect(reloadMock).not.toHaveBeenCalled();
  });
});

describe("ServicesManager integration with photos & add-ons", () => {
  const originalLocation = window.location;
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    reloadMock = vi.fn();
    delete (window as unknown as { location: unknown }).location;
    (window as unknown as { location: unknown }).location = {
      ...originalLocation,
      reload: reloadMock,
    };
  });

  afterEach(() => {
    cleanup();
    (window as unknown as { location: unknown }).location = originalLocation;
  });

  it("updates services state across tabs without refreshing the page", async () => {
    vi.mocked(deleteServiceAddon).mockResolvedValue({
      ok: true,
      data: { success: true },
    });

    const fullServices = [
      {
        id: "srv-1",
        shopId,
        categoryId: null,
        categoryName: null,
        name: "Classic Haircut",
        description: "Best cut",
        priceType: "fixed" as const,
        priceCentavos: 25000,
        durationMin: 30,
        bookingType: "slot" as const,
        capacity: 1,
        bufferMin: 0,
        active: true,
        sortOrder: 0,
        photos: [{ id: "p-1", path: "photo.jpg", sortOrder: 0 }],
        addons: [
          {
            id: "a-1",
            serviceId: "srv-1",
            name: "Pomade Finish",
            description: null,
            priceCentavos: 5000,
            durationMin: 5,
            active: true,
          },
        ],
      },
    ];

    render(
      <ServicesManager
        shopId={shopId}
        initialServices={fullServices}
        initialPackages={[]}
        initialMemberships={[]}
        shopCategories={[]}
      />,
    );

    // Initial check on All Services tab
    expect(screen.getByText(/1 photo\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/1 add-on\(s\)/)).toBeInTheDocument();

    // Switch to Service Photos & Add-ons tab
    fireEvent.click(screen.getByRole("button", { name: /Service Photos & Add-ons/ }));

    // Delete the add-on
    const deleteAddonBtn = screen.getByTitle("Delete add-on");
    await act(async () => {
      fireEvent.click(deleteAddonBtn);
    });

    // Switch back to All Services tab
    fireEvent.click(screen.getByRole("button", { name: /All Services/ }));

    // Check that photo count is still 1 and add-on count is gone/0
    expect(screen.getByText(/1 photo\(s\)/)).toBeInTheDocument();
    expect(screen.queryByText(/1 add-on\(s\)/)).not.toBeInTheDocument();

    // Page was never reloaded
    expect(reloadMock).not.toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
  });
});
