// Shared helpers for the Desire Hub / Desire Detail / Home preview screens —
// kept out of any route file so it can be imported from all three without
// coupling them to each other's screen module.
//
// Ported directly from the website's desires.js so field names/values match
// the real backend exactly (categories, status labels, content types).

export const CATEGORIES = [
  { id: 'love', label: 'Love & Relationships', emoji: '💕' },
  { id: 'money', label: 'Money & Abundance', emoji: '💰' },
  { id: 'career', label: 'Career & Purpose', emoji: '✨' },
  { id: 'health', label: 'Health & Body', emoji: '🌿' },
  { id: 'home', label: 'Home & Lifestyle', emoji: '🏠' },
  { id: 'travel', label: 'Travel & Adventure', emoji: '✈️' },
  { id: 'growth', label: 'Growth & Spirituality', emoji: '🌸' },
  { id: 'other', label: 'Other Dreams', emoji: '🌙' },
];

export function categoryLabel(value) {
  const c = CATEGORIES.find((x) => x.id === value);
  if (c) return `${c.emoji} ${c.label}`;
  return value || ''; // custom free-text category, or none set
}

export const STATUSES = [
  { value: 'active', label: '🌟 Active' },
  { value: 'manifested', label: '✅ Manifested' },
  { value: 'released', label: '🌊 Released' },
];

// Every content type a desire can link to, ported from desires.js's
// CONTENT_TYPES (plus a few extra keys services/api.js documents as valid
// for linkDesire but that don't have a dedicated section on the website yet).
export const CONTENT_TYPES = [
  { key: 'affirmation', label: 'Affirmations', icon: '✨' },
  { key: 'story', label: 'Stories', icon: '📖' },
  { key: 'mind_movie', label: 'Mind Movie', icon: '🎬' },
  { key: 'subliminal', label: 'Subliminal', icon: '🎧' },
  { key: 'feel_it_card', label: 'Feel It', icon: '💫' },
  { key: 'roadmap', label: 'Desire Action', icon: '🗺️' },
  { key: 'script', label: 'Scripts', icon: '📝' },
  { key: 'self_work', label: 'Self Work', icon: '🪞' },
  { key: 'bridge', label: 'Identity Bridge', icon: '🌉' },
  { key: 'letter', label: 'Letter to Self', icon: '💌' },
  { key: 'belief', label: 'Beliefs', icon: '🔓' },
  { key: 'let_go', label: 'Let Go', icon: '🍃' },
  { key: 'practice', label: 'Practices', icon: '🌱' },
  { key: 'read', label: 'Read', icon: '📄' },
  { key: 'gratitude', label: 'Gratitude', icon: '🙏' },
  { key: 'meditation', label: 'Meditation', icon: '🧘' },
  { key: 'vision_board', label: 'Vision Board', icon: '🖼️' },
];

export function contentTypeMeta(key) {
  return CONTENT_TYPES.find((c) => c.key === key) || { key, label: key, icon: '✦' };
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
