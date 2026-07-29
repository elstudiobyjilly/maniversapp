import { create } from 'zustand';
import { getPlanLimits } from '../services/api';

// Single source of truth for plan gating in the app — mirrors
// PLAN_LIMITS in the backend's core/config.py. We NEVER hardcode limits
// here; we always fetch live from GET /plan/limits so the app instantly
// reflects upgrades/downgrades and any backend limit changes.
export const usePlanStore = create((set, get) => ({
  plan: 'free',
  isFoundingMember: false,
  limits: {},
  loaded: false,
  loading: false,

  // Call this after login/hydrate, and again after any checkout/cancel/
  // reactivate action so the UI updates immediately.
  refresh: async () => {
    set({ loading: true });
    try {
      const data = await getPlanLimits();
      set({
        plan: data.plan || 'free',
        isFoundingMember: !!data.is_founding_member,
        limits: data.limits || {},
        loaded: true,
        loading: false,
      });
    } catch (_) {
      set({ loading: false });
    }
  },

  isPaid: () => get().plan !== 'free',

  // Returns the raw limit value for a key (number, null = unlimited, or
  // false/0 = feature off). Undefined if limits haven't loaded yet.
  limit: (key) => get().limits ? get().limits[key] : undefined,

  // Convenience: true if this feature is available at all on the current plan.
  hasFeature: (key) => {
    const v = get().limits?.[key];
    return v === true || v === null || (typeof v === 'number' && v > 0);
  },

  // Allowed voices for the current plan (free = luna only; paid = all
  // unless locked to one at checkout — backend enforces the real rule,
  // this is just for UI display of what's tappable).
  allowedVoices: () => {
    const v = get().limits?.voices;
    return Array.isArray(v) ? v : ['luna'];
  },
}));
