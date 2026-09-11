/**
 * Normalises a voter ID so "  md 1042 " and "MD-1042" resolve to one person.
 *
 * This lives in its own file on purpose. Vite's Fast Refresh only works when a
 * module exports components and nothing else, so keeping this helper out of
 * NameGateModal.tsx avoids hot-reload weirdness during development.
 */
export function normaliseVoterId(raw: string): string {
  return (raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * True for identities created before voter IDs existed: a v4 UUID, or the
 * older six-character Math.random() value. Neither is an assigned ID.
 */
export function isLegacyVoterId(id: string): boolean {
  if (!id) return true;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const isOldRandom = /^[a-z0-9]{6}$/.test(id);
  return isUuid || isOldRandom;
}
