import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getHomepageMeals } from "@/src/api/api";

export type HomepageMeal = {
  id?: string | number;
  uid?: string | number;
  name?: string;
  description?: string;
  price?: string | number;
  img?: string | null;
  food_type?: string;
  sectionName?: string;
  duration?: string | number;
  duration_days?: string | number;
  rating?: string | number;
  mrp?: string | number | null;
  original_price?: string | number | null;
  old_price?: string | number | null;
  [key: string]: any;
};

export type HomepageCategory = {
  id?: string | number;
  name?: string;
  img?: string | null;
  image?: string | null;
  discount_offer?: string | null;
  food_type?: string | null;
  meals?: HomepageMeal[];
};

export type HomepageSection = {
  id?: string | number;
  uid?: string | number;
  name?: string;
  display_type?: string;
  filter_type?: string | number | null;
  image?: string | null;
  link?: string | null;
  sort_order?: number;
  meals?: HomepageMeal[];
  categories?: HomepageCategory[];
  [key: string]: any;
};

export function isCategorySection(section?: { display_type?: string } | null) {
  return String(section?.display_type ?? "").toLowerCase() === "category";
}

export function getCategoryImage(category?: HomepageCategory | null) {
  return String(category?.img || category?.image || "");
}

export function getCategoryDiscountOffer(category?: HomepageCategory | null) {
  const offer = String(category?.discount_offer ?? "").trim();
  return offer && offer.toLowerCase() !== "null" ? offer : "";
}

export function getFoodType(source?: { food_type?: string | null } | null) {
  const value = String(source?.food_type ?? "").trim();
  return value && value.toLowerCase() !== "null" ? value : "";
}

export function getCategoryFoodType(category?: HomepageCategory | null) {
  const own = getFoodType(category);
  if (own) return own;

  const meals = Array.isArray(category?.meals) ? category.meals : [];
  for (const meal of meals) {
    const type = getFoodType(meal);
    if (type) return type;
  }
  return "";
}

function normalizeFoodTypeKey(type?: string | null) {
  return String(type ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

export function isHomemadeSection(section?: { name?: string } | null) {
  const name = String(section?.name ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  return name.includes("homemade");
}

export function isFoodTypeFilterEnabled(value?: string | number | null) {
  return Number(value) === 1 || String(value).trim() === "1";
}

export function shouldShowFoodTypeToggle(
  section?: { filter_type?: string | number | null; name?: string } | null,
  fallback?: string | number | null,
) {
  const own = section?.filter_type;
  if (own != null && String(own).trim() !== "") {
    return isFoodTypeFilterEnabled(own);
  }
  return isFoodTypeFilterEnabled(fallback) && isHomemadeSection(section);
}

export function isNonVegFoodType(type?: string | null) {
  const key = normalizeFoodTypeKey(type);
  return (
    key.includes("nonveg") ||
    key.includes("nonvegetarian") ||
    key === "egg"
  );
}

export function isVegFoodType(type?: string | null) {
  const key = normalizeFoodTypeKey(type);
  if (!key || isNonVegFoodType(key)) return false;
  return key.includes("veg");
}

export function getFoodTypeColors(type: string) {
  const key = normalizeFoodTypeKey(type);
  if (isNonVegFoodType(key)) {
    return { backgroundColor: "#FEF2F2", color: "#DC2626" };
  }
  if (key.includes("veg")) {
    return { backgroundColor: "#ECFDF5", color: "#16A34A" };
  }
  return { backgroundColor: "#F3E8FF", color: "#7C3AED" };
}

type HomepageMealsState = {
  meals: HomepageSection[];
  filterType?: string | number | null;
  loading: boolean;
  loaded: boolean;
  fetchMeals: (force?: boolean) => Promise<void>;
};

function flattenMeals(sections: any[]): HomepageMeal[] {
  if (!Array.isArray(sections)) return [];
  return sections.flatMap((section) =>
    (Array.isArray(section?.meals) ? section.meals : []).map((meal: any) => ({
      ...meal,
      sectionName: section?.name,
    })),
  );
}

let inFlightRequest: Promise<void> | null = null;

export const useHomepageMealsStore = create<HomepageMealsState>((set, get) => ({
  meals: [],
  filterType: null,
  loading: false,
  loaded: false,

  fetchMeals: async (force = false) => {
    if (!force && get().loaded) return;
    if (!force && inFlightRequest) return inFlightRequest;

    if (force && inFlightRequest) {
      try {
        await inFlightRequest;
      } catch {}
    }

    inFlightRequest = (async () => {
      set({ loading: true });
      try {
        const userId = (await AsyncStorage.getItem("user_id")) || "";
        const res = await getHomepageMeals(userId);
        set({
          meals: res?.data.sort((a: any, b: any) => a.sort_order - b.sort_order),
          filterType: res?.filter_type ?? null,
          loaded: true,
        });
      } catch {
        if (!get().loaded) set({ meals: [] });
      } finally {
        set({ loading: false });
        inFlightRequest = null;
      }
    })();

    return inFlightRequest;
  },
}));
