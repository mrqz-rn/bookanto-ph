// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ServiceCoverPhoto } from "@/features/services/components/service-cover-photo";

describe("ServiceCoverPhoto", () => {
  it("renders image initially", () => {
    render(<ServiceCoverPhoto src="https://example.com/photo.png" alt="Haircut" />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/photo.png");
    expect(img).toHaveAttribute("alt", "Haircut");
  });

  it("hides gracefully on image error", () => {
    const { container } = render(
      <ServiceCoverPhoto src="https://example.com/broken.png" alt="Haircut" />,
    );
    const img = container.querySelector("img")!;
    expect(img).not.toBeNull();
    fireEvent.error(img);
    expect(container.firstChild).toBeNull();
  });
});
