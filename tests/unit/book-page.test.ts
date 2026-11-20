import { describe, expect, it, vi } from "vitest";

import BookPage from "@/app/book/page";

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
}));

describe("BookPage redirect handler", () => {
  it("redirects to /book/:serviceId when ?service= is provided", async () => {
    redirectMock.mockClear();
    await expect(
      BookPage({
        searchParams: Promise.resolve({ service: "8ea895d9-5607-4529-a5cf-d0b005433d0e" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT: /book/8ea895d9-5607-4529-a5cf-d0b005433d0e");

    expect(redirectMock).toHaveBeenCalledWith("/book/8ea895d9-5607-4529-a5cf-d0b005433d0e");
  });

  it("redirects to /book/:serviceId when ?serviceId= is provided", async () => {
    redirectMock.mockClear();
    await expect(
      BookPage({
        searchParams: Promise.resolve({ serviceId: "service-456" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT: /book/service-456");

    expect(redirectMock).toHaveBeenCalledWith("/book/service-456");
  });

  it("redirects to /explore when no service param is provided", async () => {
    redirectMock.mockClear();
    await expect(
      BookPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT: /explore");

    expect(redirectMock).toHaveBeenCalledWith("/explore");
  });
});
