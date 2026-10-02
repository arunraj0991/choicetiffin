import { createPersistStore } from "./persist-wrapper";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  rcode: string;
  token: string;
};

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
};

export const useAuthStore = createPersistStore<AuthState, Pick<AuthState, "user">>(
  "auth-store",
  (set: (partial: Partial<AuthState>) => void) => ({
    user: null,
    setUser: (user: AuthUser) => set({ user }),
    clearUser: () => set({ user: null }),
  }),
  {
    partialize: (state) => ({ user: state.user }),
  },
);
