import { create } from "zustand";
import { persist, createJSONStorage, PersistOptions } from "zustand/middleware";
import { zustandStorage } from "./storage";

export const createPersistStore = <T, P = T>(
  storeName: string,
  stateCreator: any,
  options?: Partial<PersistOptions<T, P>>,
) => {
  return create<T>()(
    persist(stateCreator, {
      name: storeName,
      storage: createJSONStorage(() => zustandStorage),
      ...options,
    } as PersistOptions<T, P>),
  );
};
