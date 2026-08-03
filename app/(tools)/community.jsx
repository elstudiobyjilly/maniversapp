import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { getCommunityPosts, createCommunityPost, loveCommunityPost, deleteCommunityPost, createCheckout } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import Dropdown from '../../components/Dropdown';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii } from '../../constants/theme';
import * as Linking from 'expo-linking';

// Ported exactly from the website's compose selects (explore.js / features.html).
const TYPE_OPTIONS = [
  { value: 'intention', label: '🌱 Intention' },
  { value: 'success', label: '🎉 Success Story' },
  { value: 'technique', label: '🌟 Technique' },
];
const CATEGORY_OPTIONS = [
  { value: 'general', label: '🌸 General' },
  { value: 'love', label: '💕 Love' },
  { value: 'money', label: '💰 Money' },
  { value: 'health', label: '🌿 Health' },
  { value: 'career', label: '✨ Career' },
];
// The filter dropdowns use slightly different emoji from the compose ones on
// the site itself — kept as-is for fidelity rather than "fixed" to match.
const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: '🌟 Type' },
  { value: 'intention', label: '🌱 Intentions' },
  { value: 'success', label: '🎉 Success' },
  { value: 'technique', label: '✨ Technique' },
];
const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: '🌸 Category' },
  { value: 'general', label: '✨ General' },
  { value: 'love', label: '💕 Love' },
  { value: 'money', label: '💰 Money' },
  { value: 'career', label: '🚀 Career' },
  { value: 'health', label: '🌿 Health' },
];
const TRUNCATE_AT = 220;

// Anonymous posts get a "Soul {emoji} {N}" pseudonym, generated once per
// post id and stable only within this screen's lifetime — matches the
// website's in-memory _communityAnonMap (resets every page load).
const ANON_EMOJIS = ['🌸', '✨', '🌙', '💫', '🦋', '🌿', '💕', '🔮', '🌺', '⭐'];

export default function Community() {
  const { hasFeature, refresh } = usePlanStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('intention');
  const [category, setCategory] = useState('general');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const user = useAuthStore((s) => s.user);
  const myUsername = user?.username;
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const anonMap = useRef({});
  const anonCount = useRef(0);
  const getPostLabel = (p) => {
    if (p.username === myUsername) return 'You ✨';
    if (p.show_name && p.display_name) return `${p.display_name.split(' ')[0]} 🌸`;
    if (!anonMap.current[p.id]) {
      anonMap.current[p.id] = `Soul ${ANON_EMOJIS[anonCount.current % ANON_EMOJIS.length]} ${anonCount.current + 1}`;
      anonCount.current += 1;
    }
    return anonMap.current[p.id];
  };

  const load = async () => {
    try { setPosts(await getCommunityPosts()); } catch (e) { setError(e.message || 'Could not load feed'); }
  };

  useEffect(() => { refresh(); load().finally(() => setLoading(false)); }, []);

  const submitPost = async (showName) => {
    if (!hasFeature('community_post')) {
      setShowUpgrade(true);
      return;
    }
    if (!content.trim()) { setError('Share an intention or thought.'); return; }
    setError(''); setPosting(true);
    try {
      const post = await createCommunityPost({ content: content.trim(), show_name: showName, category, post_type: postType });
      setPosts((prev) => [post, ...prev]);
      setContent('');
    } catch (e) {
      if (e.status === 403) setShowUpgrade(true);
      else setError(e.message || 'Could not post');
    } finally { setPosting(false); }
  };

  const handlePost = (showName) => {
    if (!showName) { submitPost(false); return; }
    const firstName = (user?.full_name || user?.username || '').split(' ')[0] || 'Your name';
    Alert.alert(
      'Share with your name?',
      `Your first name "${firstName}" will be visible to everyone in the community.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Share', onPress: () => submitPost(true) }]
    );
  };

  const handleLove = async (postId) => {
    setPosts((prev) => prev.map((p) => p.id === postId
      ? { ...p, i_loved: !p.i_loved, love_count: p.i_loved ? p.love_count - 1 : p.love_count + 1 }
      : p));
    try { await loveCommunityPost(postId); } catch (_) {}
  };

  const handleDelete = async (postId) => {
    try {
      await deleteCommunityPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) { setError(e.message || 'Could not delete'); }
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const timeAgo = (dateStr) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const visiblePosts = posts.filter((p) => {
    if (mineOnly && p.username !== myUsername) return false;
    if (typeFilter !== 'all' && (p.post_type || '').toLowerCase() !== typeFilter) return false;
    if (categoryFilter !== 'all' && (p.category || '').toLowerCase() !== categoryFilter) return false;
    return true;
  });

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <ScreenHeader lead="Community" accent="Wall" subtitle="Share your manifestations. Send love. Rise together. 🌸" />

        <GlassCard style={{ marginTop: 16, marginBottom: 18 }}>
          <View style={styles.writeBox}>
            <TextInput
              style={styles.composeInput}
              placeholder="I am manifesting my dream... / I just manifested... 🌸"
              placeholderTextColor="rgba(46,37,48,0.4)"
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={500}
            />
          </View>
          <Text style={styles.charCount}>{content.length} / 500</Text>

          <View style={{ gap: 8, marginTop: 12 }}>
            <Dropdown label="Type" value={postType} options={TYPE_OPTIONS} onSelect={setPostType} fullWidth />
            <Dropdown label="Category" value={category} options={CATEGORY_OPTIONS} onSelect={setCategory} fullWidth />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.shareRow}>
            <Button title="Share Anonymously ✨" size="sm" onPress={() => handlePost(false)} loading={posting} style={{ flex: 1 }} />
            <Button title="Share with Name" variant="ghost" size="sm" onPress={() => handlePost(true)} disabled={posting} style={{ flex: 1 }} />
          </View>
        </GlassCard>

        <View style={styles.filterTopRow}>
          <TouchableOpacity style={[styles.filterPill, typeFilter === 'all' && categoryFilter === 'all' && !mineOnly && styles.filterPillActive]} onPress={() => { setTypeFilter('all'); setCategoryFilter('all'); setMineOnly(false); }}>
            <Text style={[styles.filterPillText, typeFilter === 'all' && categoryFilter === 'all' && !mineOnly && styles.filterPillTextActive]}>All</Text>
          </TouchableOpacity>
          <Dropdown label="🎉 Type" value={typeFilter} options={TYPE_FILTER_OPTIONS} onSelect={setTypeFilter} />
          <Dropdown label="🌸 Category" value={categoryFilter} options={CATEGORY_FILTER_OPTIONS} onSelect={setCategoryFilter} />
          <TouchableOpacity style={[styles.filterPill, mineOnly && styles.filterPillActive]} onPress={() => setMineOnly(!mineOnly)}>
            <Text style={[styles.filterPillText, mineOnly && styles.filterPillTextActive]}>Mine</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.muted}>Loading feed...</Text>
        ) : visiblePosts.length === 0 ? (
          <Text style={styles.muted}>No posts yet — be the first ✨</Text>
        ) : (
          visiblePosts.map((p) => {
            const isLong = p.content.length > TRUNCATE_AT;
            const isExpanded = expanded.has(p.id);
            const displayText = isLong && !isExpanded ? p.content.slice(0, TRUNCATE_AT).trim() + '…' : p.content;
            return (
              <GlassCard key={p.id} style={styles.feedCard}>
                <View style={styles.feedHead}>
                  <Text style={styles.feedName}>{getPostLabel(p)}</Text>
                  <View style={styles.feedHeadRight}>
                    <TouchableOpacity onPress={() => handleLove(p.id)} style={styles.lovePill}>
                      <Text style={styles.lovePillText}>{p.i_loved ? '💕' : '🤍'} {p.love_count}</Text>
                    </TouchableOpacity>
                    <Text style={styles.metaText}>{timeAgo(p.created_at)}</Text>
                  </View>
                </View>
                <Text style={styles.feedText}>
                  {displayText}
                  {isLong && (
                    <Text style={styles.moreLink} onPress={() => toggleExpand(p.id)}> {isExpanded ? 'less' : 'more'}</Text>
                  )}
                </Text>
                {p.username === myUsername && (
                  <TouchableOpacity onPress={() => handleDelete(p.id)} style={styles.deleteRow}>
                    <Text style={styles.deleteIconText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                )}
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      <UpgradeModal
        visible={showUpgrade}
        message="Posting to the Community Wall is a Manifestor feature -- you can still browse and send love for free."
        onClose={() => setShowUpgrade(false)}
        onSelectPlan={async (priceKey) => {
          try { const res = await createCheckout(priceKey); if (res?.url) await Linking.openURL(res.url); }
          catch (_) {}
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  writeBox: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.35)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  composeInput: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink, minHeight: 70 },
  charCount: { fontFamily: fonts.body, fontSize: 11, color: colors.mist2, textAlign: 'right', marginTop: 6 },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: 10, textAlign: 'center' },
  shareRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  filterTopRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'flex-start' },
  filterPill: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 50, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  filterPillActive: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  filterPillText: { color: '#2e2530', fontSize: 12, fontWeight: '500' },
  filterPillTextActive: { color: '#fff', fontWeight: '700' },
  muted: { color: '#6b5c66', fontSize: 13, textAlign: 'center', marginTop: 20 },

  feedCard: { marginBottom: 12 },
  feedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  feedHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedName: { fontFamily: fonts.bodyMedium, fontWeight: '700', color: colors.ink, fontSize: 13 },
  feedText: { fontFamily: fonts.displayItalic, color: colors.ink2, fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  moreLink: { fontFamily: fonts.bodyMedium, color: colors.mist, fontSize: 13, fontWeight: '600', fontStyle: 'normal' },
  lovePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(248,184,200,0.2)', borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 9 },
  lovePillText: { fontSize: 11.5, color: colors.pinkDark, fontWeight: '600' },
  metaText: { color: '#6b5c66', fontSize: 11 },
  deleteRow: { alignSelf: 'flex-start', marginTop: 10 },
  deleteIconText: { fontSize: 11.5, color: colors.mist },
});
