// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  ServicePhotosGallery,
  type ServicePhoto,
} from "@/features/bookings/components/customer/service-photos-gallery";

afterEach(() => {
  cleanup();
});

const mockPhotos: ServicePhoto[] = [
  { id: "p-1", path: "services/1/photo-1.jpg", url: "https://example.com/photo-1.jpg" },
  { id: "p-2", path: "services/1/photo-2.jpg", url: "https://example.com/photo-2.jpg" },
  { id: "p-3", path: "services/1/photo-3.jpg", url: "https://example.com/photo-3.jpg" },
];

describe("ServicePhotosGallery", () => {
  it("renders null when photos array is empty", () => {
    const { container } = render(<ServicePhotosGallery photos={[]} serviceName="Haircut" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders single photo without thumbnails or carousel arrows", () => {
    render(<ServicePhotosGallery photos={[mockPhotos[0]!]} serviceName="Haircut" />);

    const img = screen.getByAltText("Haircut sample photo 1");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/photo-1.jpg");

    // No next/prev buttons for 1 photo
    expect(screen.queryByLabelText("Next photo")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Previous photo")).not.toBeInTheDocument();
  });

  it("renders multi-photo carousel with counter and thumbnails", () => {
    render(<ServicePhotosGallery photos={mockPhotos} serviceName="Haircut" />);

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByAltText("Haircut sample photo 1")).toBeInTheDocument();

    // Thumbnails exist
    expect(screen.getByLabelText("View photo 1")).toBeInTheDocument();
    expect(screen.getByLabelText("View photo 2")).toBeInTheDocument();
    expect(screen.getByLabelText("View photo 3")).toBeInTheDocument();

    // Click next photo button
    const nextBtn = screen.getByLabelText("Next photo");
    fireEvent.click(nextBtn);

    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByAltText("Haircut sample photo 2")).toBeInTheDocument();

    // Click thumbnail 3
    fireEvent.click(screen.getByLabelText("View photo 3"));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByAltText("Haircut sample photo 3")).toBeInTheDocument();
  });

  it("opens fullscreen lightbox when clicked and closes with close button", () => {
    render(<ServicePhotosGallery photos={mockPhotos} serviceName="Haircut" />);

    // Click main container to open lightbox
    const mainImg = screen.getByAltText("Haircut sample photo 1");
    fireEvent.click(mainImg);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByAltText("Haircut full preview")).toBeInTheDocument();

    // Close lightbox
    const closeBtn = screen.getByLabelText("Close photo preview");
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
