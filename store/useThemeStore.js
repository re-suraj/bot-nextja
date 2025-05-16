import { create } from "zustand";

const useThemeStore = create((set) => ({
  isDark: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("isDark")) || false : false,
  toggleTheme: () =>
    set((state) => {
      const updatedState = { isDark: !state.isDark };
      if (typeof window !== 'undefined') {
        localStorage.setItem("isDark", updatedState.isDark);
      }
      return updatedState;
    }),
}));

export default useThemeStore;
