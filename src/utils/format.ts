export function formatPrice(price: string | number | null | undefined) {
  const num = Number(price);
  if (Number.isNaN(num)) return String(price ?? "");
  return Math.round(num).toLocaleString("en-IN");
}

export function toPriceNumber(price: string | number | null | undefined) {
  if (price === null || price === undefined || price === "") return NaN;
  if (typeof price === "number") return price;
  const match = String(price)
    .replace(/,/g, "")
    .match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : Number(price);
}

export function hasMealPrice(price: string | number | null | undefined) {
  return Number.isFinite(toPriceNumber(price));
}

export function getMealMrp(
  price: string | number | null | undefined,
  mrp?: string | number | null,
) {
  if (!hasMealPrice(price)) return null;
  if (mrp === null || mrp === undefined || mrp === "") return null;

  const selling = toPriceNumber(price);
  const fromApi = toPriceNumber(mrp);
  if (!Number.isFinite(fromApi) || fromApi <= selling) return null;

  return fromApi;
}

export function getMealSaveAmount(
  price: string | number | null | undefined,
  mrp?: string | number | null,
) {
  const markedMrp = getMealMrp(price, mrp);
  if (markedMrp == null || !hasMealPrice(price)) return null;
  const save = markedMrp - toPriceNumber(price);
  return save > 0 ? save : null;
}

export function getMealDurationDays(item?: {
  duration?: string | number | null;
  duration_days?: string | number | null;
  durationdays?: string | number | null;
  time?: string | number | null;
} | null) {
  return (
    item?.duration ??
    item?.duration_days ??
    item?.durationdays ??
    item?.time ??
    null
  );
}

export function getMealPackageDays(item?: {
  duration?: string | number | null;
  duration_days?: string | number | null;
  durationdays?: string | number | null;
  time?: string | number | null;
} | null) {
  const days = Number(getMealDurationDays(item));
  return Number.isFinite(days) && days > 0 ? days : 1;
}

export function getMealPackagePricing(
  item?: {
    price?: string | number | null;
    mrp?: string | number | null;
    duration?: string | number | null;
    duration_days?: string | number | null;
    durationdays?: string | number | null;
    time?: string | number | null;
  } | null,
  qty: string | number | null | undefined = 1,
) {
  const unitPrice = toPriceNumber(item?.price);
  if (!Number.isFinite(unitPrice)) return null;

  const days = getMealPackageDays(item);
  const quantity = Number(qty);
  const multiplier =
    days * (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  const packagePrice = unitPrice * multiplier;
  const unitMrp = getMealMrp(item?.price, item?.mrp);
  const packageMrp = unitMrp != null ? unitMrp * multiplier : null;
  const saveAmount =
    packageMrp != null ? packageMrp - packagePrice : null;

  return {
    days,
    qty: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unitPrice,
    packagePrice,
    packageMrp:
      packageMrp != null && packageMrp > packagePrice ? packageMrp : null,
    saveAmount: saveAmount != null && saveAmount > 0 ? saveAmount : null,
  };
}

export function formatPlanDuration(
  duration: string | number | null | undefined,
  unitPrice?: string | number | null,
) {
  const days = Number(duration);
  if (!Number.isFinite(days) || days <= 0) return null;

  const dayLabel = days === 1 ? "day" : "days";
  if (hasMealPrice(unitPrice)) {
    return `${days}-${dayLabel} Plan (₹${formatPrice(unitPrice)} per thali/day)`;
  }
  return `${days}-${dayLabel} Plan`;
}

export function parseMealDescriptionItems(
  description?: string | { name?: string; qty?: string | number }[] | null,
) {
  if (!description) return [];

  let items = description;
  if (typeof items === "string") {
    const trimmed = items.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        items = JSON.parse(trimmed);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const name = String(item?.name ?? "").trim();
      const qty = String(item?.qty ?? "").trim();
      return { name, qty };
    })
    .filter((item) => item.name);
}

export function formatMealDescription(
  description?: string | { name?: string; qty?: string | number }[] | null,
) {
  if (typeof description === "string") {
    const trimmed = description.trim();
    if (trimmed && !trimmed.startsWith("[")) return trimmed;
  }

  const items = parseMealDescriptionItems(description);
  if (!items.length) return "";

  return items
    .map((item) => (item.qty ? `${item.qty} ${item.name}` : item.name))
    .join(", ");
}

export function formatWalletAmount(price: string | number | null | undefined) {
  const num = toPriceNumber(price);
  if (!Number.isFinite(num)) return "0.00";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseWalletFromAccount(res: any): {
  amount: number;
  currency: string;
} {
  const data =
    res?.data && typeof res.data === "object" && !Array.isArray(res.data)
      ? res.data
      : res || {};
  const user = data.user || {};
  const candidates = [
    user.c_wallet,
    data.c_wallet,
    user.wallet,
    user.balance,
    user.wallet_amount,
    user.wallet_balance,
    data.wallet,
    data.balance,
    data.wallet_amount,
    data.wallet_balance,
  ];
  let amount = 0;
  for (const value of candidates) {
    const num = toPriceNumber(value);
    if (Number.isFinite(num)) {
      amount = num;
      break;
    }
  }
  const currency = String(user.currency || data.currency || "₹").trim() || "₹";
  return { amount, currency };
}
