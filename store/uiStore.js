import { create } from 'zustand';

// Lets a screen hide the floating tab bar while it's showing something
// that should own the whole screen (e.g. Vision Board's fullscreen mode) --
// the tab bar is a position:absolute overlay drawn by the tab layout, not
// something a child screen can cover or push out of the way on its own.
export const useUiStore = create((set) => ({
  tabBarHidden: false,
  setTabBarHidden: (hidden) => set({ tabBarHidden: hidden }),
}));
