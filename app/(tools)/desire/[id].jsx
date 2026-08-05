import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../../components/GlassCard';
import GradientBackground from '../../../components/GradientBackground';
import Chip from '../../../components/Chip';
import Button from '../../../components/Button';
import { colors, fonts, gradients, radii } from '../../../constants/theme';
import { CATEGORIES, categoryLabel, STATUSES, CONTENT_TYPES, timeAgo } from '../../../constants/desires';
import {
  getDesire, updateDesire, deleteDesire, touchDesireActivity, unlinkDesire, linkDesire,
  getAffirmations, getStories, getMindMovies, getSubSessions, getBeliefs, getLetGo,
  getGratitudeList, getFeelItCards, getScripts,
} from '../../../services/api';

// One route per content type, for the section's "open full list" arrow.
const TYPE_ROUTES = {
  affirmation: '/affirmations', story: '/stories', mind_movie: '/mindmovie', subliminal: '/subliminal',
  feel_it_card: '/feelit', roadmap: '/desire-action', script: '/scripting', self_work: '/futureself',
  bridge: '/futureself', letter: '/futureself', belief: '/beliefs', let_go: '/letgo', practice: '/practice',
  read: '/discover', gratitude: '/gratitude', meditation: '/meditate', vision_board: '/vision-board',
};

// Only the content types with an unambiguous single list endpoint get a
// working "+ Link" picker; the rest still show existing links (if any) via
// the arrow into their real screen. mind_movie/subliminal are the only
// types wired for tap-to-play (?playId=) so far.
const LINK_SOURCES = {
  affirmation: { fetch: () => getAffirmations(50, 0), title: (i) => i.desire || 'Affirmations' },
  story: { fetch: () => getStories(50, 0), title: (i) => i.title || 'Story' },
  mind_movie: { fetch: getMindMovies, title: (i) => i.title || 'Untitled', playRoute: (i) => ({ pathname: '/mindmovie', params: { playId: i.id } }) },
  subliminal: { fetch: getSubSessions, title: (i) => i.label || i.audio_items?.[0]?.desire || 'Session', playRoute: (i) => ({ pathname: '/subliminal', params: { playId: i.id } }) },
  belief: { fetch: getBeliefs, title: (i) => i.belief || 'Belief' },
  let_go: { fetch: getLetGo, title: (i) => i.content || 'Entry' },
  gratitude: { fetch: () => getGratitudeList(50), title: (i) => i.content || 'Entry' },
  feel_it_card: { fetch: getFeelItCards, title: (i) => i.state || 'Card' },
  script: { fetch: getScripts, title: (i) => (i.content || '').split('\n\n')[0]?.slice(0, 40) || 'Script' },
};

// A desire's cover URL can 404/expire without the record itself changing —
// falls back to the gradient placeholder instead of rendering blank white.
function DesireCover({ uri, style }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <LinearGradient colors={gradients.avatar} style={style} />;
  return <Image source={{ uri }} style={style} onError={() => setFailed(true)} />;
}

export default function DesireDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [desire, setDesire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');

  const [pickerType, setPickerType] = useState(null); // content_type key, or null when closed
  const [pickerItems, setPickerItems] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [linking, setLinking] = useState(null); // id currently being linked

  const load = async () => {
    try {
      const d = await getDesire(id);
      setDesire(d);
      setTitle(d.title || '');
      const isKnown = CATEGORIES.some((c) => c.id === d.category);
      setCategory(isKnown ? d.category : null);
      setShowCustomCategory(!!d.category && !isKnown);
      setCustomCategory(!isKnown ? (d.category || '') : '');
      setTargetDate(d.target_date ? String(d.target_date).slice(0, 10) : '');
      setDescription(d.description || '');
    } catch (e) {
      setError(e.message || 'Could not load this desire');
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    touchDesireActivity(id).catch(() => {});
  }, [id]);

  const handleSetStatus = async (status) => {
    setDesire((prev) => ({ ...prev, status }));
    try { await updateDesire(id, { status }); } catch (e) { setError(e.message || 'Could not update status'); }
  };

  const handleSaveEdit = async () => {
    if (!title.trim()) { setError('Name your desire first ✨'); return; }
    setError(''); setSaving(true);
    try {
      const updated = await updateDesire(id, {
        title: title.trim(),
        category: showCustomCategory ? (customCategory.trim() || null) : category,
        target_date: targetDate.trim() || null,
        description: description.trim(),
      });
      setDesire((prev) => ({ ...prev, ...updated }));
      setEditing(false);
    } catch (e) {
      setError(e.message || 'Could not save changes');
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete this desire?', 'All links will be removed. Your content stays.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteDesire(id); router.back(); } catch (e) { setError(e.message || 'Could not delete'); }
      } },
    ]);
  };

  // desire.links is an object keyed by content type (e.g. { affirmation: [...],
  // story: [...] }), not a flat array — matches the website's desires.js shape.
  const handleUnlink = async (linkId, contentType) => {
    try {
      await unlinkDesire(id, linkId);
      setDesire((prev) => ({
        ...prev,
        links: {
          ...(prev.links || {}),
          [contentType]: (prev.links?.[contentType] || []).filter((l) => l.link_id !== linkId),
        },
      }));
    } catch (_) {}
  };

  const openPicker = async (contentType) => {
    const source = LINK_SOURCES[contentType];
    if (!source) return;
    setPickerType(contentType);
    setPickerLoading(true);
    setPickerItems([]);
    try {
      const list = await source.fetch();
      const linkedIds = new Set((desire.links?.[contentType] || []).map((l) => String(l.content_id)));
      const items = (Array.isArray(list) ? list : []).filter((i) => !linkedIds.has(String(i.id)));
      setPickerItems(items);
    } catch (_) {} finally { setPickerLoading(false); }
  };

  const handleLink = async (item) => {
    const source = LINK_SOURCES[pickerType];
    setLinking(item.id);
    try {
      const link = await linkDesire(id, { content_type: pickerType, content_id: item.id, content_title: source.title(item) });
      setDesire((prev) => ({
        ...prev,
        links: { ...(prev.links || {}), [pickerType]: [...(prev.links?.[pickerType] || []), link] },
      }));
      setPickerItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (_) {} finally { setLinking(null); }
  };

  const handleMarkManifested = () => handleSetStatus('manifested');

  if (loading) {
    return <GradientBackground><View style={styles.center}><ActivityIndicator size="large" color={colors.purpleMid} /></View></GradientBackground>;
  }

  if (!desire) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Desire not found'}</Text>
        </View>
      </GradientBackground>
    );
  }

  const linksByType = desire.links || {};
  // Show a section for anything already linked, plus every type that has a
  // working "+ Link" picker, so the panel matches the website's full set of
  // categories instead of only appearing once something's linked.
  const visibleTypes = CONTENT_TYPES.filter((ct) => (linksByType[ct.key] || []).length > 0 || LINK_SOURCES[ct.key]);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }}>
        <DesireCover uri={desire.images?.[0]} style={styles.coverImage} />

        {editing ? (
          <GlassCard style={{ marginTop: 16 }}>
            <Text style={styles.fieldLbl}>Your Desire</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor="rgba(46,37,48,0.4)" />
            </View>

            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  label={`${c.emoji} ${c.label}`}
                  active={!showCustomCategory && category === c.id}
                  onPress={() => { setCategory(c.id); setShowCustomCategory(false); }}
                />
              ))}
              <Chip label="✏️ Custom" active={showCustomCategory} onPress={() => setShowCustomCategory(true)} />
            </View>
            {showCustomCategory && (
              <View style={[styles.inputBox, { marginTop: 8 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Type your own category..."
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  maxLength={50}
                />
              </View>
            )}

            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Target Date (YYYY-MM-DD)</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.input} value={targetDate} onChangeText={setTargetDate} placeholder="2026-12-31" placeholderTextColor="rgba(46,37,48,0.4)" />
            </View>
            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Intention</Text>
            <View style={[styles.inputBox, { minHeight: 70 }]}>
              <TextInput style={styles.input} value={description} onChangeText={setDescription} multiline placeholderTextColor="rgba(46,37,48,0.4)" />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button title="Save" onPress={handleSaveEdit} loading={saving} style={{ flex: 1 }} />
              <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        ) : (
          <>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{desire.title}</Text>
              <TouchableOpacity onPress={() => setEditing(true)}><Text style={styles.editIcon}>✏️</Text></TouchableOpacity>
            </View>
            {desire.category ? <Text style={styles.category}>{categoryLabel(desire.category)} · {timeAgo(desire.last_activity_at || desire.updated_at || desire.created_at)}</Text> : (
              <Text style={styles.category}>{timeAgo(desire.last_activity_at || desire.updated_at || desire.created_at)}</Text>
            )}
            {desire.target_date ? <Text style={styles.targetDate}>🎯 Target: {new Date(desire.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text> : null}
            {desire.description ? <Text style={styles.description}>{desire.description}</Text> : null}

            <View style={styles.statusRow}>
              {STATUSES.map((s) => (
                <Chip key={s.value} label={s.label} active={(desire.status || 'active') === s.value} onPress={() => handleSetStatus(s.value)} />
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button title="✅ Mark as Manifested" variant="ghost" onPress={handleMarkManifested} style={{ marginTop: 16, alignSelf: 'center' }} textStyle={{ color: colors.success }} />

            <Text style={styles.sectionTitle}>Linked Practices</Text>
            {visibleTypes.length === 0 ? (
              <Text style={styles.muted}>Nothing linked yet — affirmations, stories, and other practices you connect to this desire will show up here.</Text>
            ) : (
              visibleTypes.map((ct) => {
                const items = linksByType[ct.key] || [];
                const source = LINK_SOURCES[ct.key];
                const route = TYPE_ROUTES[ct.key];
                return (
                  <View key={ct.key} style={{ marginBottom: 18 }}>
                    <View style={styles.linkTypeHead}>
                      <Text style={styles.linkTypeHeading}>{ct.icon} {ct.label}</Text>
                      {items.length > 0 && <View style={styles.countChip}><Text style={styles.countChipText}>{items.length}</Text></View>}
                      <View style={{ flex: 1 }} />
                      {route && (
                        <TouchableOpacity style={styles.linkTypeIconBtn} onPress={() => router.push(route)} hitSlop={6}>
                          <Text style={styles.linkTypeIconText}>→</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.linkGrid}>
                      {items.map((l) => {
                        const playRoute = source?.playRoute && source.playRoute({ id: l.content_id });
                        return (
                          <View key={l.link_id} style={styles.linkCard}>
                            {playRoute && (
                              <TouchableOpacity style={styles.linkPlayBtn} onPress={() => router.push(playRoute)}>
                                <Text style={styles.linkPlayIcon}>▶</Text>
                              </TouchableOpacity>
                            )}
                            <Text style={styles.linkCardTitle} numberOfLines={3}>{l.content_title || 'Untitled'}</Text>
                            <TouchableOpacity style={styles.unlinkBtn} onPress={() => handleUnlink(l.link_id, ct.key)}>
                              <Text style={styles.unlinkIcon}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                      {source && (
                        <TouchableOpacity style={styles.linkAddCard} onPress={() => openPicker(ct.key)}>
                          <Text style={styles.linkAddIcon}>＋</Text>
                          <Text style={styles.linkAddText}>Link {ct.label}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            <Button title="🗑️ Delete This Desire" variant="danger" onPress={handleDelete} fullWidth style={{ marginTop: 12 }} />
          </>
        )}
      </ScrollView>

      <Modal visible={!!pickerType} animationType="slide" transparent onRequestClose={() => setPickerType(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Link {pickerType ? contentTypeLabel(pickerType) : ''}</Text>
              <TouchableOpacity onPress={() => setPickerType(null)} hitSlop={8}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            {pickerLoading ? (
              <ActivityIndicator color={colors.purpleMid} style={{ marginVertical: 30 }} />
            ) : pickerItems.length === 0 ? (
              <Text style={styles.muted}>Nothing available to link — everything's already linked, or there's nothing created yet.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {pickerItems.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.pickerRow} onPress={() => handleLink(item)} disabled={linking === item.id}>
                    <Text style={styles.pickerRowText} numberOfLines={2}>{LINK_SOURCES[pickerType].title(item)}</Text>
                    {linking === item.id ? <ActivityIndicator size="small" color={colors.purpleMid} /> : <Text style={styles.pickerRowAdd}>＋</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

function contentTypeLabel(key) {
  return CONTENT_TYPES.find((c) => c.key === key)?.label || key;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coverImage: { width: '100%', height: 180, borderRadius: radii.md },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, flex: 1 },
  editIcon: { fontSize: 18, marginLeft: 10 },
  category: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, marginTop: 4 },
  targetDate: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, marginTop: 8, fontWeight: '600' },
  description: { fontFamily: fonts.displayItalic, fontSize: 14.5, color: colors.ink2, marginTop: 12, lineHeight: 21, fontStyle: 'italic' },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },

  fieldLbl: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  inputBox: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: 12, textAlign: 'center' },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, lineHeight: 19 },

  sectionTitle: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.ink, fontWeight: '600', marginTop: 24, marginBottom: 10 },

  linkTypeHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  linkTypeHeading: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, fontWeight: '700' },
  countChip: { backgroundColor: 'rgba(201,168,201,0.18)', borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 8 },
  countChipText: { fontFamily: fonts.body, fontSize: 10.5, color: colors.purpleDark, fontWeight: '600' },
  linkTypeIconBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', alignItems: 'center', justifyContent: 'center' },
  linkTypeIconText: { fontSize: 13, color: colors.purpleDark, fontWeight: '700' },

  linkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  linkCard: {
    width: '47%', minHeight: 90, backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, padding: 12, justifyContent: 'center',
  },
  linkCardTitle: { fontFamily: fonts.displayItalic, fontSize: 13, color: colors.ink, fontStyle: 'italic', textAlign: 'center' },
  linkPlayBtn: { alignSelf: 'center', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(201,168,201,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  linkPlayIcon: { fontSize: 12, color: colors.purpleDark },
  unlinkBtn: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  unlinkIcon: { fontSize: 11, color: colors.mist2 },

  linkAddCard: {
    width: '47%', minHeight: 90, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(201,168,201,0.4)',
    borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)',
  },
  linkAddIcon: { fontSize: 20, color: colors.purpleDark, marginBottom: 4 },
  linkAddText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist, textAlign: 'center', paddingHorizontal: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(20,8,40,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: 20, maxHeight: '70%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink },
  modalClose: { fontSize: 16, color: colors.mist },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.12)' },
  pickerRowText: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: colors.ink, marginRight: 10 },
  pickerRowAdd: { fontSize: 16, color: colors.purpleDark, fontWeight: '700' },
});
