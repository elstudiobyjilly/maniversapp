// Shared helpers for the Desire Hub / Desire Detail / Home preview screens —
// kept out of any route file so it can be imported from all three without
// coupling them to each other's screen module.

export const CATEGORIES = [
  { value: 'general', label: '✦ General' },
  { value: 'love', label: '💕 Love' },
  { value: 'money', label: '💰 Money' },
  { value: 'health', label: '🌿 Health' },
  { value: 'career', label: '🚀 Career' },
  { value: 'home', label: '🏡 Home' },
];

export function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label.replace(/^\S+\s/, '') || value || 'general';
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
