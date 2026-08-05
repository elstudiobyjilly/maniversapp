import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Share, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Dropdown from '../../components/Dropdown';
import Button from '../../components/Button';
import ExpandableTextArea from '../../components/ExpandableTextArea';
import { colors, fonts, radii } from '../../constants/theme';
import { getManifested, addManifested, deleteManifested } from '../../services/api';

const IG_DISMISS_KEY = 'mv_ig_man_dismissed';

// Ported exactly from the website's explore.js (MAN_ICONS + category select).
const CATEGORIES = [
  { value: 'love', label: '💕 Love' },
  { value: 'money', label: '💰 Money' },
  { value: 'career', label: '✨ Career' },
  { value: 'health', label: '🌿 Health' },
  { value: 'home', label: '🏠 Home' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'other', label: '🌸 Other' },
];
const CATEGORY_META = {
  love: { ic: '💕', label: 'Love' }, money: { ic: '💰', label: 'Money' }, career: { ic: '✨', label: 'Career' },
  health: { ic: '🌿', label: 'Health' }, home: { ic: '🏠', label: 'Home' }, travel: { ic: '✈️', label: 'Travel' },
  other: { ic: '🌸', label: 'Other' },
};
const FILTER_PILLS = [
  { value: 'all', label: 'All' },
  { value: 'love', label: '💕 Love' },
  { value: 'money', label: '💰 Money' },
  { value: 'career', label: '✨ Career' },
  { value: 'health', label: '🌿 Health' },
];

function parseEntry(item) {
  const parts = (item.title || '').split(': ');
  const cat = parts.length > 1 ? parts[0].toLowerCase().trim() : '';
  const category = CATEGORY_META[cat] ? cat : 'other';
  const title = parts.length > 1 && CATEGORY_META[cat] ? parts.slice(1).join(': ').trim() : item.title;
  const note = item.note && !item.note.startsWith('data:image') && item.note !== '[photo]' && item.note !== title ? item.note : '';
  return { category, title, note };
}

function ManifestedEntry({ item, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const { category, title, note } = parseEntry(item);
  const meta = CATEGORY_META[category];
  const dateStr = new Date(item.manifested_at || item.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleShare = async () => {
    try { await Share.share({ message: `${meta.ic} ${title}${note ? '\n\n' + note : ''}` }); } catch (_) {}
  };

  return (
    <GlassCard style={styles.entryCard}>
      <View style={styles.entryHead}>
        <Text style={styles.entryBadge}>{meta.ic} {meta.label}</Text>
        <View style={styles.entryHeadRight}>
          <Text style={styles.entryDate}>{dateStr}</Text>
          <TouchableOpacity onPress={handleShare}><Text style={styles.entryIcon}>📤</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item.id)}><Text style={styles.entryIcon}>🗑️</Text></TouchableOpacity>
        </View>
      </View>
      <Text style={styles.entryTitle}>{title}</Text>
      {note ? (
        <>
          <Text style={styles.entryNote} numberOfLines={expanded ? undefined : 3}>{note}</Text>
          {note.length > 120 && (
            <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
              <Text style={styles.readMore}>{expanded ? 'Show less' : 'Read more'}</Text>
            </TouchableOpacity>
          )}
        </>
      ) : null}
    </GlassCard>
  );
}

export default function Manifested() {
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [category, setCategory] = useState('love');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharingStory, setSharingStory] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [showIgCta, setShowIgCta] = useState(false);

  const storyCardRef = useRef(null);

  const load = async () => {
    try { setList(await getManifested()); } catch (e) { setError(e.message || 'Could not load'); }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    AsyncStorage.getItem(IG_DISMISS_KEY).then((v) => { if (!v) setShowIgCta(true); });
  }, []);

  useEffect(() => {
    if (list.length === 0) setShowIgCta(false);
  }, [list.length]);

  const handleDismissIg = () => {
    setShowIgCta(false);
    AsyncStorage.setItem(IG_DISMISS_KEY, '1').catch(() => {});
  };

  const handleAdd = async () => {
    if (!title.trim()) { setError('Write what you manifested ✨'); return; }
    setError(''); setSaving(true);
    try {
      const encodedTitle = `${category}: ${title.trim()}`.slice(0, 200);
      const row = await addManifested({ title: encodedTitle, note: story.trim().slice(0, 900) });
      setList((prev) => [row, ...prev]);
      setTitle(''); setStory('');
      if (list.length === 0) setShowIgCta(true);
    } catch (e) {
      setError(e.message || 'Could not save');
    } finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Remove this manifestation?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await deleteManifested(id); } catch (_) {}
        setList((prev) => prev.filter((m) => m.id !== id));
      } },
    ]);
  };

  const handleShare = async () => {
    if (!title.trim()) { setError('Write what you manifested first ✨'); return; }
    try { await Share.share({ message: `🎉 ${title.trim()}${story.trim() ? '\n\n' + story.trim() : ''}` }); } catch (_) {}
  };

  const handleShareToStory = async () => {
    if (!title.trim()) { setError('Write what you manifested first ✨'); return; }
    setError(''); setSharingStory(true);
    try {
      const uri = await captureRef(storyCardRef, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(uri);
    } catch (_) {} finally { setSharingStory(false); }
  };

  const filtered = filter === 'all' ? list : list.filter((item) => parseEntry(item).category === filter);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader lead="Manifested" accent="Log" subtitle="Your proof of power. Everything the universe delivered. 🎉" />

        {showIgCta && (
          <View style={styles.igCta}>
            <TouchableOpacity style={styles.igCtaClose} onPress={handleDismissIg}><Text style={styles.igCtaCloseText}>✕</Text></TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>📸</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.igCtaTitle}>Tell the world ✨</Text>
                <Text style={styles.igCtaBody}>Did Manivers help you manifest something? Share your story on Instagram and tag <Text style={{ fontWeight: '700' }}>@manivers.app</Text> — we'd love to celebrate with you 🌸</Text>
                <TouchableOpacity style={styles.igCtaBtn} onPress={() => Linking.openURL('https://www.instagram.com/manivers.app/')}>
                  <Text style={styles.igCtaBtnText}>📸 Share on Instagram</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.statCard}>
          <Text style={styles.statNum}>{list.length}</Text>
          <Text style={styles.statLabel}>Manifested ✨</Text>
        </View>

        <GlassCard style={styles.mb16}>
          <Text style={styles.label}>WHAT DID YOU MANIFEST?</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="e.g. My dream job offer arrived!"
              placeholderTextColor="rgba(46,37,48,0.4)"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>YOUR STORY (OPTIONAL)</Text>
          <ExpandableTextArea
            value={story}
            onChangeText={setStory}
            placeholder="How did it happen? How did you feel?..."
            modalTitle="Your Story"
            minHeight={120}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.btnRow}>
            <Dropdown value={category} options={CATEGORIES} onSelect={setCategory} />
            <Button title="+ Log 🎉" size="sm" onPress={handleAdd} loading={saving} />
            <Button title="🔗 Share" size="sm" variant="ghost" onPress={handleShare} />
            <Button title="📤 Share to Story" size="sm" variant="ghost" onPress={handleShareToStory} loading={sharingStory} />
          </View>
        </GlassCard>

        {/* Off-screen branded card used only to capture "Share to Story" */}
        <View style={styles.hiddenCaptureWrap} pointerEvents="none">
          <View ref={storyCardRef} collapsable={false} style={styles.storyCard}>
            <Text style={styles.storyCardBrand}>MANIVERS</Text>
            <Text style={styles.storyCardIcon}>🎉</Text>
            <Text style={styles.storyCardTitle}>{title || 'My Manifestation'}</Text>
            {story ? <Text style={styles.storyCardNote} numberOfLines={5}>{story}</Text> : null}
            <Text style={styles.storyCardWatermark}>manivers.com</Text>
          </View>
        </View>

        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionHeading}>Your Manifestations</Text>
        </View>
        <View style={styles.filterRow}>
          {FILTER_PILLS.map((f) => (
            <TouchableOpacity key={f.value} style={[styles.filterPill, filter === f.value && styles.filterPillActive]} onPress={() => setFilter(f.value)}>
              <Text style={[styles.filterPillText, filter === f.value && styles.filterPillTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 20 }} />
        ) : filtered.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>{list.length === 0 ? 'Log your first manifestation above ✨' : `No ${filter} manifestations yet ✨`}</Text>
          </GlassCard>
        ) : (
          filtered.map((item) => <ManifestedEntry key={item.id} item={item} onDelete={handleDelete} />)
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  mb16: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  inputBox: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: 10, textAlign: 'center' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' },

  igCta: { backgroundColor: 'rgba(253,232,240,0.7)', borderWidth: 1, borderColor: 'rgba(247,168,196,0.35)', borderRadius: radii.md, padding: 16, marginBottom: 16 },
  igCtaClose: { position: 'absolute', top: 6, right: 10, zIndex: 1, padding: 4 },
  igCtaCloseText: { color: colors.mist, fontSize: 14 },
  igCtaTitle: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink, marginBottom: 4 },
  igCtaBody: { fontFamily: fonts.body, fontSize: 12, color: colors.ink2, lineHeight: 18, marginBottom: 10 },
  igCtaBtn: { alignSelf: 'flex-start', backgroundColor: colors.pinkAccent, borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 16 },
  igCtaBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },

  statCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.md, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  statNum: { fontFamily: fonts.display, fontSize: 30, color: colors.purpleDark, fontWeight: '300' },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, marginTop: 2, fontWeight: '500' },

  sectionHeadRow: { marginTop: 4, marginBottom: 10 },
  sectionHeading: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ink, fontWeight: '400' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  filterPill: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  filterPillActive: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  filterPillText: { color: '#2e2530', fontSize: 12, fontWeight: '500' },
  filterPillTextActive: { color: '#fff', fontWeight: '700' },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '500', color: '#2e2530', textAlign: 'center' },

  entryCard: { marginBottom: 10 },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  entryBadge: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.purpleDark, backgroundColor: 'rgba(201,168,201,0.15)', borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: 9, fontWeight: '500' },
  entryHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryDate: { fontFamily: fonts.body, fontSize: 10.5, color: colors.mist },
  entryIcon: { fontSize: 13 },
  entryTitle: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink, fontWeight: '400' },
  entryNote: { fontFamily: fonts.displayItalic, fontSize: 12.5, color: colors.mist, fontStyle: 'italic', lineHeight: 19, marginTop: 3 },
  readMore: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.purpleDark, marginTop: 2 },

  hiddenCaptureWrap: { position: 'absolute', top: -9999, left: -9999 },
  storyCard: { width: 320, padding: 28, backgroundColor: '#1a0f2e', alignItems: 'center', borderRadius: 24 },
  storyCardBrand: { color: 'rgba(255,255,255,0.6)', fontSize: 13, letterSpacing: 2, marginBottom: 20 },
  storyCardIcon: { fontSize: 40, marginBottom: 12 },
  storyCardTitle: { color: '#fff', fontSize: 20, fontFamily: fonts.display, textAlign: 'center', marginBottom: 10 },
  storyCardNote: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  storyCardWatermark: { color: 'rgba(155,109,255,0.6)', fontSize: 11, letterSpacing: 1, marginTop: 8 },
});
