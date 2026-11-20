import { describe, expect, it } from "vitest";

import { parseWalkInGuest, walkInNote } from "@/features/bookings/walk-in-notes";

describe("walk-in notes", () => {
  it("reads the name, phone and note", () => {
    const notes = "Walk-in: Aling Nena · 09181234567 · Notes: Clean cut";
    expect(parseWalkInGuest(notes)).toEqual({ name: "Aling Nena", phone: "09181234567" });
    expect(walkInNote(notes)).toBe("Clean cut");
  });

  it("doesn't take the note for a phone when there is no phone", () => {
    const notes = "Walk-in: Juan · Notes: Short taper fade";
    expect(parseWalkInGuest(notes)).toEqual({ name: "Juan", phone: null });
    expect(walkInNote(notes)).toBe("Short taper fade");
  });

  it("handles a guest with only a name", () => {
    expect(parseWalkInGuest("Walk-in: Walk-in Guest")).toEqual({
      name: "Walk-in Guest",
      phone: null,
    });
    expect(walkInNote("Walk-in: Walk-in Guest")).toBeNull();
  });

  it("leaves notes from online bookings alone", () => {
    expect(parseWalkInGuest("Please use the side gate")).toBeNull();
    expect(walkInNote("Please use the side gate")).toBe("Please use the side gate");
    expect(walkInNote(null)).toBeNull();
  });
});
