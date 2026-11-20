// addWalkIn (actions.ts) stores the guest in the booking's notes, because a
// walk-in has no customer account: "Walk-in: Name · phone · Notes: …", where
// the phone and the shop's note are optional. Browser-safe.

const PREFIX = "Walk-in:";
const NOTE_SEPARATOR = " · Notes: ";

/** The guest's name and phone, or null when the notes aren't in that form. */
export function parseWalkInGuest(
  notes: string | null,
): { name: string | null; phone: string | null } | null {
  if (!notes?.startsWith(PREFIX)) return null;
  const guest = notes.slice(PREFIX.length).split(NOTE_SEPARATOR)[0] ?? "";
  const [name, phone] = guest.split("·").map((part) => part.trim() || null);
  return { name: name ?? null, phone: phone ?? null };
}

/** The shop's own note, without the packed guest details. */
export function walkInNote(notes: string | null): string | null {
  if (!notes) return null;
  if (!notes.startsWith(PREFIX)) return notes;
  return notes.split(NOTE_SEPARATOR)[1]?.trim() || null;
}
