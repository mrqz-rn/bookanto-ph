// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addServicePhoto,
  archiveService,
  createServiceAddon,
  deleteService,
  deleteServiceAddon,
  removeServicePhoto,
  updateServiceAddon,
} from "@/features/services/actions";
import {
  ServicePhotosAddons,
  type ServiceOption,
} from "@/features/services/components/service-photos-addons";
import { ServicesManager } from "@/features/services/components/services-manager";
import type { MenuService } from "@/features/services/menu";

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
  archiveService: vi.fn(),
  deleteService: vi.fn(),
}));

const shopId = "11111111-1111-1111-1111-111111111111";

const haircut: ServiceOption = {
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
};

function menuService(overrides: Partial<MenuService> = {}): MenuService {
  return {
    id: "srv-1",
    shopId,
    categoryId: null,
    categoryName: null,
    name: "Classic Haircut",
    description: "Best cut",
    priceType: "fixed",
    priceCentavos: 25000,
    durationMin: 30,
    bookingType: "slot",
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
    ...overrides,
  };
}

function renderManager(services: MenuService[]) {
  return render(
    <ServicesManager
      shopId={shopId}
      initialServices={services}
      initialPackages={[]}
      initialMemberships={[]}
      shopCategories={[]}
    />,
  );
}

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

describe("ServicePhotosAddons", () => {
  it("shows the service's photos and add-ons", () => {
    render(<ServicePhotosAddons shopId={shopId} service={haircut} />);

    expect(screen.getByRole("heading", { name: /Photos/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Add-ons/ })).toBeInTheDocument();
    expect(screen.getByText("Hair Spa")).toBeInTheDocument();
    expect(screen.getByText("+₱150 · +15 min")).toBeInTheDocument();
    expect(screen.getAllByAltText("Service photo")).toHaveLength(2);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("adds a photo without reloading the page", async () => {
    const onUpdateService = vi.fn();
    vi.mocked(addServicePhoto).mockResolvedValue({
      ok: true,
      data: { mediaId: "photo-3", path: "services/srv-1/photo3.jpg" },
    });

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
        <ServicePhotosAddons shopId={shopId} service={haircut} onUpdateService={onUpdateService} />,
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
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

      expect(screen.getAllByAltText("Service photo")).toHaveLength(3);
      expect(onUpdateService).toHaveBeenCalledWith("srv-1", expect.any(Function));
      expect(mockRefresh).toHaveBeenCalled();
      expect(reloadMock).not.toHaveBeenCalled();
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });

  it("turns away a file that isn't a photo before uploading", async () => {
    render(<ServicePhotosAddons shopId={shopId} service={haircut} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [new File(["x"], "menu.pdf", { type: "application/pdf" })] },
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/JPEG, PNG or WebP/);
    expect(addServicePhoto).not.toHaveBeenCalled();
  });

  it("removes a photo without reloading the page", async () => {
    const onUpdateService = vi.fn();
    vi.mocked(removeServicePhoto).mockResolvedValue({ ok: true, data: { success: true } });

    render(
      <ServicePhotosAddons shopId={shopId} service={haircut} onUpdateService={onUpdateService} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove photo 1" }));
    });

    expect(removeServicePhoto).toHaveBeenCalledWith({
      serviceId: "srv-1",
      shopId,
      mediaId: "photo-1",
    });
    expect(screen.getAllByAltText("Service photo")).toHaveLength(1);
    expect(onUpdateService).toHaveBeenCalledWith("srv-1", expect.any(Function));
    expect(mockRefresh).toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("creates an add-on", async () => {
    const onUpdateService = vi.fn();
    vi.mocked(createServiceAddon).mockResolvedValue({ ok: true, data: { addonId: "addon-2" } });

    render(
      <ServicePhotosAddons shopId={shopId} service={haircut} onUpdateService={onUpdateService} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add an add-on" }));
    fireEvent.change(screen.getByLabelText("Add-on name"), {
      target: { value: "Scalp Massage" },
    });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "50" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save add-on" }));
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
    expect(screen.getByText("Scalp Massage")).toBeInTheDocument();
    expect(onUpdateService).toHaveBeenCalledWith("srv-1", expect.any(Function));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("keeps the add-on form open and says why when the price isn't a number", async () => {
    render(<ServicePhotosAddons shopId={shopId} service={haircut} />);

    fireEvent.click(screen.getByRole("button", { name: "Add an add-on" }));
    fireEvent.change(screen.getByLabelText("Add-on name"), { target: { value: "Wash" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("form", { name: "New add-on" }));
    });

    expect(screen.getByText(/Enter a price in pesos/)).toBeInTheDocument();
    expect(createServiceAddon).not.toHaveBeenCalled();
  });

  it("asks before deleting an add-on", async () => {
    const onUpdateService = vi.fn();
    vi.mocked(deleteServiceAddon).mockResolvedValue({ ok: true, data: { success: true } });

    render(
      <ServicePhotosAddons shopId={shopId} service={haircut} onUpdateService={onUpdateService} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Hair Spa" }));
    expect(deleteServiceAddon).not.toHaveBeenCalled();
    expect(screen.getByText(/Delete Hair Spa\? You can't undo this/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });

    expect(deleteServiceAddon).toHaveBeenCalledWith({ addonId: "addon-1", shopId });
    expect(screen.queryByText("Hair Spa")).not.toBeInTheDocument();
    expect(screen.getByText(/No add-ons for Classic Haircut yet/)).toBeInTheDocument();
    expect(onUpdateService).toHaveBeenCalledWith("srv-1", expect.any(Function));
  });

  it("switches an add-on off", async () => {
    vi.mocked(updateServiceAddon).mockResolvedValue({ ok: true, data: { success: true } });

    render(<ServicePhotosAddons shopId={shopId} service={haircut} />);

    const toggle = screen.getByRole("switch", { name: "Offered" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(updateServiceAddon).toHaveBeenCalledWith({
      addonId: "addon-1",
      shopId,
      name: "Hair Spa",
      priceCentavos: 15000,
      durationMin: 15,
      active: false,
    });
    expect(screen.getByRole("switch", { name: "Offered" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});

describe("ServicesManager", () => {
  it("keeps the menu row in step with the photos and add-ons sheet", async () => {
    vi.mocked(deleteServiceAddon).mockResolvedValue({ ok: true, data: { success: true } });
    renderManager([menuService()]);

    const row = screen.getByRole("article", { name: "Classic Haircut" });
    expect(within(row).getByText("1 photo, 1 add-on")).toBeInTheDocument();

    fireEvent.click(within(row).getByRole("button", { name: /^Photos and add-ons/ }));
    const sheet = screen.getByRole("dialog", { name: "Photos & add-ons" });

    fireEvent.click(within(sheet).getByRole("button", { name: "Delete Pomade Finish" }));
    await act(async () => {
      fireEvent.click(within(sheet).getByRole("button", { name: "Delete" }));
    });

    fireEvent.click(within(sheet).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(row).getByText("1 photo")).toBeInTheDocument();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("hides a service from the menu and says so", async () => {
    vi.mocked(archiveService).mockResolvedValue({
      ok: true,
      data: { success: true, active: false },
    });
    renderManager([menuService()]);

    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "On menu" }));
    });

    expect(archiveService).toHaveBeenCalledWith({ serviceId: "srv-1", shopId, active: false });
    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Hid Classic Haircut from customers.");
    expect(screen.getByText("1 service, all hidden from customers.")).toBeInTheDocument();
  });

  it("puts the switch back when hiding fails", async () => {
    vi.mocked(archiveService).mockResolvedValue({
      ok: false,
      code: "INTERNAL",
      message: "Something went wrong.",
    } as never);
    renderManager([menuService()]);

    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "On menu" }));
    });

    expect(screen.getByRole("switch", { name: "On menu" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });

  it("deletes a service only after the check", async () => {
    vi.mocked(deleteService).mockResolvedValue({ ok: true, data: { success: true } });
    renderManager([menuService(), menuService({ id: "srv-2", name: "Beard Trim" })]);

    fireEvent.click(screen.getByRole("button", { name: "Delete Beard Trim" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(deleteService).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete Beard Trim" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    });

    expect(deleteService).toHaveBeenCalledWith({ serviceId: "srv-2", shopId });
    expect(screen.queryByRole("article", { name: "Beard Trim" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Deleted Beard Trim.");
  });

  it("groups services by category", () => {
    render(
      <ServicesManager
        shopId={shopId}
        initialServices={[
          menuService({ id: "a", name: "Fade", categoryId: "cat-1", categoryName: "Barbershop" }),
          menuService({ id: "b", name: "Manicure", categoryId: null }),
        ]}
        initialPackages={[]}
        initialMemberships={[]}
        shopCategories={[{ id: "cat-1", name: "Barbershop", slug: "barbershop", icon: "scissors" }]}
      />,
    );

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Barbershop1", "Other services1"]);
  });

  it("offers templates, a form and an import on an empty menu", () => {
    renderManager([]);

    expect(screen.getByRole("heading", { name: "Add your first service" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start from a template" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a service" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import a spreadsheet" })).toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys", () => {
    renderManager([menuService()]);

    const services = screen.getByRole("tab", { name: /Services/ });
    expect(services).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(services, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: /Packages/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Packages" })).toBeInTheDocument();
  });
});
