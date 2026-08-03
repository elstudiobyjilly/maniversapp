import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Dropdown from '../../components/Dropdown';
import Chip from '../../components/Chip';
import Button from '../../components/Button';
import { colors, fonts, gradients, radii } from '../../constants/theme';
import { CATEGORIES, categoryLabel, timeAgo } from '../../constants/desires';
import { getDesires, createDesire, uploadImage } from '../../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLS = SCREEN_WIDTH >= 700 ? 3 : 2;

const CATEGORY_FILTER_OPTIONS = [{ value: 'all', label: 'All Categories' }, ...CATEGORIES];

export default function DesireHub() {
  const router = useRouter();
  const [desires, setDesires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [error, setError] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setDesires(await getDesires()); } catch (e) { setError(e.message || 'Could not load your desires'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handlePickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    setUploadingCover(true);
    try {
      const url = await uploadImage(result.assets[0].uri, 'vision-board');
      setCoverUrl(url);
    } catch (_) {} finally { setUploadingCover(false); }
  };

  const resetForm = () => {
    setTitle(''); setCategory('general'); setTargetDate(''); setDescription(''); setCoverUrl(null);
  };

  const handleCreate = async () => {
    if (!title.trim()) { setError('Name your desire first ✨'); return; }
    setError(''); setSaving(true);
    try {
      const desire = await createDesire({
        title: title.trim(),
        description: description.trim(),
        target_date: targetDate.trim() || null,
        category,
        images: coverUrl ? [coverUrl] : null,
      });
      setDesires((prev) => [desire, ...prev]);
      resetForm();
      setAddOpen(false);
    } catch (e) {
      setError(e.message || 'Could not create desire');
    } finally { setSaving(false); }
  };

  const filtered = desires.filter((d) => categoryFilter === 'all' || (d.category || 'general') === categoryFilter);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }}>
        <View style={styles.headRow}>
          <ScreenHeader lead="My" accent="Desire Hub" style={{ marginBottom: 0, flex: 1 }} />
          <TouchableOpacity style={styles.newBtn} onPress={() => setAddOpen((v) => !v)}>
            <Text style={styles.newBtnText}>{addOpen ? '✕ Cancel' : '+ New Desire'}</Text>
          </TouchableOpacity>
        </View>

        {addOpen && (
          <GlassCard style={{ marginTop: 16, marginBottom: 8 }}>
            <Text style={styles.fieldLbl}>Your Desire</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="e.g. My dream home, financial freedom..."
                placeholderTextColor="rgba(46,37,48,0.4)"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Chip key={c.value} label={c.label} active={category === c.value} onPress={() => setCategory(c.value)} />
              ))}
            </View>

            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Target Date (optional, YYYY-MM-DD)</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="2026-12-31"
                placeholderTextColor="rgba(46,37,48,0.4)"
                value={targetDate}
                onChangeText={setTargetDate}
              />
            </View>

            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Description (optional)</Text>
            <View style={[styles.inputBox, { minHeight: 70 }]}>
              <TextInput
                style={styles.input}
                placeholder="What does having this look and feel like?"
                placeholderTextColor="rgba(46,37,48,0.4)"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <TouchableOpacity style={styles.coverBtn} onPress={handlePickCover} disabled={uploadingCover}>
              {uploadingCover ? (
                <ActivityIndicator size="small" color={colors.purpleDark} />
              ) : coverUrl ? (
                <Image source={{ uri: coverUrl }} style={styles.coverPreview} />
              ) : (
                <Text style={styles.coverBtnText}>📷 Add a cover photo (optional)</Text>
              )}
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button title="✨ Create Desire" onPress={handleCreate} loading={saving} fullWidth style={{ marginTop: 12 }} />
          </GlassCard>
        )}

        <View style={{ marginTop: 16, marginBottom: 16 }}>
          <Dropdown value={categoryFilter} options={CATEGORY_FILTER_OPTIONS} onSelect={setCategoryFilter} fullWidth />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 20 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.muted}>No desires here yet — create your first one ✨</Text>
        ) : (
          <View style={styles.grid}>
            {filtered.map((d) => (
              <TouchableOpacity key={d.id} style={[styles.card, { width: `${100 / COLS - 2}%` }]} onPress={() => router.push(`/desire/${d.id}`)}>
                {d.images?.[0] ? (
                  <Image source={{ uri: d.images[0] }} style={styles.cardImage} />
                ) : (
                  <LinearGradient colors={gradients.avatar} style={styles.cardImage} />
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{d.title}</Text>
                  <Text style={styles.cardCategory}>{categoryLabel(d.category)}</Text>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardMeta}>{timeAgo(d.updated_at || d.created_at)}</Text>
                    <Text style={styles.cardMeta}>{d.target_date ? new Date(d.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'no target date'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  newBtn: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderRadius: radii.pill, paddingVertical: 9, paddingHorizontal: 14 },
  newBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, fontWeight: '600' },

  fieldLbl: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  inputBox: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: 10, textAlign: 'center' },

  coverBtn: { marginTop: 12, borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderStyle: 'dashed', borderRadius: radii.sm, padding: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.35)' },
  coverBtnText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist },
  coverPreview: { width: '100%', height: 100, borderRadius: radii.sm },

  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, textAlign: 'center', marginTop: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' },
  card: { backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, overflow: 'hidden', marginBottom: 12 },
  cardImage: { width: '100%', height: 100 },
  cardBody: { padding: 10 },
  cardTitle: { fontFamily: fonts.displayMedium, fontSize: 14, color: colors.ink, fontWeight: '600', marginBottom: 2 },
  cardCategory: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, marginBottom: 6 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMeta: { fontFamily: fonts.body, fontSize: 9.5, color: colors.mist2 },
});
