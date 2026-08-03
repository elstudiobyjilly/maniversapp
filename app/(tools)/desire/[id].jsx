import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../../components/GlassCard';
import GradientBackground from '../../../components/GradientBackground';
import Chip from '../../../components/Chip';
import Button from '../../../components/Button';
import { colors, fonts, gradients, radii } from '../../../constants/theme';
import { CATEGORIES, categoryLabel, timeAgo } from '../../../constants/desires';
import { getDesire, updateDesire, deleteDesire, touchDesireActivity, unlinkDesire } from '../../../services/api';

const STATUSES = [
  { value: 'active', label: '🌱 Active' },
  { value: 'manifested', label: '🏆 Manifested' },
  { value: 'released', label: '🕊️ Released' },
];

const CONTENT_ICONS = {
  affirmation: '✨', story: '📖', mind_movie: '🎬', script: '✍️', feel_it_card: '💫',
  let_go: '🌿', practice: '🌟', read: '📄', self_work: '🪞', gratitude: '🙏',
  meditation: '🧘', vision_board: '🖼️', belief: '💡', roadmap: '🗺️', subliminal: '🎧',
};

export default function DesireDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [desire, setDesire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    try {
      const d = await getDesire(id);
      setDesire(d);
      setTitle(d.title || '');
      setCategory(d.category || 'general');
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
        category,
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
    Alert.alert('Delete this desire?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteDesire(id); router.back(); } catch (e) { setError(e.message || 'Could not delete'); }
      } },
    ]);
  };

  const handleUnlink = async (linkId) => {
    try {
      await unlinkDesire(id, linkId);
      setDesire((prev) => ({ ...prev, links: (prev.links || []).filter((l) => l.id !== linkId) }));
    } catch (_) {}
  };

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

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }}>
        {desire.images?.[0] ? (
          <Image source={{ uri: desire.images[0] }} style={styles.coverImage} />
        ) : (
          <LinearGradient colors={gradients.avatar} style={styles.coverImage} />
        )}

        {editing ? (
          <GlassCard style={{ marginTop: 16 }}>
            <Text style={styles.fieldLbl}>Your Desire</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor="rgba(46,37,48,0.4)" />
            </View>
            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Chip key={c.value} label={c.label} active={category === c.value} onPress={() => setCategory(c.value)} />
              ))}
            </View>
            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Target Date (YYYY-MM-DD)</Text>
            <View style={styles.inputBox}>
              <TextInput style={styles.input} value={targetDate} onChangeText={setTargetDate} placeholder="2026-12-31" placeholderTextColor="rgba(46,37,48,0.4)" />
            </View>
            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Description</Text>
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
            <Text style={styles.category}>{categoryLabel(desire.category)} · {timeAgo(desire.updated_at || desire.created_at)}</Text>
            {desire.target_date ? <Text style={styles.targetDate}>🎯 Target: {new Date(desire.target_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text> : null}
            {desire.description ? <Text style={styles.description}>{desire.description}</Text> : null}

            <View style={styles.statusRow}>
              {STATUSES.map((s) => (
                <Chip key={s.value} label={s.label} active={(desire.status || 'active') === s.value} onPress={() => handleSetStatus(s.value)} />
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.sectionTitle}>Linked Practices</Text>
            {(desire.links || []).length === 0 ? (
              <Text style={styles.muted}>Nothing linked yet — affirmations, stories, and other practices you connect to this desire will show up here.</Text>
            ) : (
              <GlassCard noPadding>
                {(desire.links || []).map((l, i) => (
                  <View key={l.id} style={[styles.linkRow, i < desire.links.length - 1 && styles.linkRowDivider]}>
                    <Text style={styles.linkIcon}>{CONTENT_ICONS[l.content_type] || '✦'}</Text>
                    <Text style={styles.linkTitle} numberOfLines={1}>{l.content_title || l.content_type}</Text>
                    <TouchableOpacity onPress={() => handleUnlink(l.id)}><Text style={styles.unlinkIcon}>✕</Text></TouchableOpacity>
                  </View>
                ))}
              </GlassCard>
            )}

            <Button title="🗑️ Delete This Desire" variant="danger" onPress={handleDelete} fullWidth style={{ marginTop: 24 }} />
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
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
  inputBox: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: 12, textAlign: 'center' },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, lineHeight: 19 },

  sectionTitle: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.ink, fontWeight: '600', marginTop: 24, marginBottom: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  linkRowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.12)' },
  linkIcon: { fontSize: 16 },
  linkTitle: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: colors.ink },
  unlinkIcon: { fontSize: 13, color: colors.mist2 },
});
