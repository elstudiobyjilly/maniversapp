import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginRequest, registerRequest, sendOtp, verifyOtp, getMe, setApiToken } from '../services/api';

const TOKEN_KEY = 'mv_token';
const USER_KEY = 'mv_user';

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  isHydrated: false,
  isAuthenticated: false,

  hydrate: async () => {
    try {
      const pairs = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
      const token = pairs[0][1];
      const userStr = pairs[1][1];
      if (token && userStr) {
        setApiToken(token);
        set({ token, user: JSON.parse(userStr), isAuthenticated: true });
      }
    } catch (_) {}
    set({ isHydrated: true });
  },

  login: async (username, password) => {
    const d = await loginRequest(username, password);
    await get()._saveAuth(d);
  },

  register: async ({ full_name, username, email, password }) => {
    const d = await registerRequest({ full_name, username, email, password });
    await get()._saveAuth(d);
    try { await sendOtp(email, 'verify'); } catch (_) {}
    return d;
  },

  confirmOtp: async (email, code) => {
    const d = await verifyOtp(email, code);
    await get()._saveAuth(d);
  },

  _saveAuth: async (d) => {
    const user = {
      id: d.user_id,
      username: d.username,
      email: d.email,
      full_name: d.full_name,
      plan: d.plan || 'free',
      plan_status: d.plan_status || 'active',
    };
    setApiToken(d.access_token);
    await AsyncStorage.setItem(TOKEN_KEY, d.access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token: d.access_token, user, isAuthenticated: true });
    try {
      const me = await getMe();
      if (me && me.id) {
        const merged = { ...user, ...me };
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(merged));
        set({ user: merged });
      }
    } catch (_) {}
  },

  // Re-pull /auth/me and merge it over the cached user. Screens call this
  // after anything that consumes an AI quota so the usage badges update
  // immediately — mirrors the website's _fetchAndUpdateUsage().
  refreshUser: async () => {
    try {
      const me = await getMe();
      if (me && me.id) {
        const merged = { ...(get().user || {}), ...me };
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(merged));
        set({ user: merged });
      }
    } catch (_) {}
  },

  logout: async () => {
    setApiToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
