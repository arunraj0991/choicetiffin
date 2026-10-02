const SLOT_ORDER = ["Breakfast", "Lunch", "Dinner"] as const;

function addSlotsFromCategory(allowed: Set<string>, raw: unknown) {
  const categories = Array.isArray(raw)
    ? raw
    : String(raw ?? "").split(",");

  categories.forEach((entry) => {
    const cat = String(entry ?? "")
      .trim()
      .toLowerCase();
    if (!cat) return;
    if (cat.includes("breakfast")) allowed.add("Breakfast");
    if (cat.includes("lunch") || cat.includes("dinner")) {
      allowed.add("Lunch");
      allowed.add("Dinner");
    }
  });
}

export function getAllowedSlotIdsFromCategories(
  categoryValues: unknown[],
): string[] {
  const allowed = new Set<string>();
  (Array.isArray(categoryValues) ? categoryValues : []).forEach((value) =>
    addSlotsFromCategory(allowed, value),
  );
  return SLOT_ORDER.filter((id) => allowed.has(id));
}

export function getSlotMultiplier(_slots?: string[] | string | null) {
  return 1;
}

export function filterDeliverySlots<T extends { id: string }>(
  allSlots: T[],
  allowedIds: string[],
): T[] {
  if (!allowedIds.length) {
    return allSlots.filter(
      (slot) => slot.id === "Lunch" || slot.id === "Dinner",
    );
  }
  return allSlots.filter((slot) => allowedIds.includes(slot.id));
}
