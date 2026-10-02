import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FoodTypeFilter = "all" | "veg" | "nonveg";

const STORAGE_KEY = "food_type_filter";

export function parseFoodTypeFilter(value?: string | null): FoodTypeFilter {
  const key = String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  if (key === "nonveg" || key === "nonvegetarian") return "nonveg";
  if (key === "all") return "all";
  if (key === "veg" || key === "vegetarian" || key === "vegan") return "veg";
  return "veg";
}

type FoodTypeFilterState = {
  filter: FoodTypeFilter;
  loaded: boolean;
  setFilter: (value: FoodTypeFilter) => void;
  hydrate: () => Promise<void>;
};

export const useFoodTypeFilterStore = create<FoodTypeFilterState>((set, get) => ({
  filter: "veg",
  loaded: false,

  setFilter: (value) => {
    set({ filter: value, loaded: true });
    AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {});
  },

  hydrate: async () => {
    if (get().loaded) return;
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        set({ filter: parseFoodTypeFilter(saved), loaded: true });
        return;
      }
      const diet = await AsyncStorage.getItem("user_food_type");
      set({
        filter: diet ? parseFoodTypeFilter(diet) : "veg",
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));

useFoodTypeFilterStore.getState().hydrate();
