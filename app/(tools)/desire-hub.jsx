import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Dropdown from '../../components/Dropdown';
import Chip from '../../components/Chip';
import Button from '../../components/Button';
import { colors, fonts, gradients, radii } from '../../constants/theme';
import { CATEGORIES, categoryLabel, timeAgo } from '../../constants/desires';
import { getDesires, createDesire, getVisionBoard, getMindMovies } from '../../services/api';
import { safeImageUri } from '../../services/imageUri';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Website always runs 2 columns, phone or tablet — match that instead of
// cramming 3 across on iPad.
const COLS = 2;

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  ...CATEGORIES.map((c) => ({ value: c.id, label: `${c.emoji} ${c.label}` })),
];

// A desire's cover URL can 404/expire without the record itself changing —
// falls back to the gradient placeholder instead of rendering blank white.
function DesireCover({ uri, style }) {
  const [failed, setFailed] = useState(false);
  // R2 keys with spaces/special characters in the filename hit iOS's
  // "Protocol error" in RN's Image, which doesn't auto-encode the URL the
  // way a browser <img> silently does.
  const safeUri = safeImageUri(uri);
  if (!safeUri || failed) return <LinearGradient colors={gradients.avatar} style={style} />;
  return <Image source={{ uri: safeUri }} style={style} onError={() => setFailed(true)} />;
}

export default function DesireHub() {
  const router = useRouter();
  const [desires, setDesires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [error, setError] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(null); // null = none picked yet
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState(null);
  const [imgPickerOpen, setImgPickerOpen] = useState(false);
  const [availableImages, setAvailableImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setDesires(await getDesires()); } catch (e) { setError(e.message || 'Could not load your desires'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  // The website doesn't upload a fresh photo for a desire cover — it lets
  // you pick from images you've already added to Vision Board or Mind
  // Movies. Matches that exactly instead of a separate upload flow.
  const handleOpenImagePicker = async () => {
    setImgPickerOpen(true);
    setLoadingImages(true);
    try {
      const imgs = [];
      try {
        const vb = await getVisionBoard();
        (vb.items || []).forEach((item) => { if (item.url) imgs.push(item.url); });
      } catch (_) {}
      try {
        const movies = await getMindMovies();
        (Array.isArray(movies) ? movies : []).forEach((m) => {
          (m.scenes || []).forEach((s) => { if (s.img) imgs.push(s.img); });
        });
      } catch (_) {}
      setAvailableImages([...new Set(imgs)]);
    } finally {
      setLoadingImages(false);
    }
  };

  const handlePickCover = (url) => {
    setCoverUrl(url);
    setImgPickerOpen(false);
  };

  const resetForm = () => {
    setTitle(''); setCategory(null); setCustomCategory(''); setShowCustomCategory(false);
    setTargetDate(''); setDescription(''); setCoverUrl(null);
  };

  const handleCreate = async () => {
    if (!title.trim()) { setError('Name your desire first ✨'); return; }
    setError(''); setSaving(true);
    try {
      const desire = await createDesire({
        title: title.trim(),
        description: description.trim(),
        target_date: targetDate.trim() || null,
        category: showCustomCategory ? (customCategory.trim() || null) : category,
        images: coverUrl ? [coverUrl] : null,
      });
      setDesires((prev) => [desire, ...prev]);
      resetForm();
      setAddOpen(false);
    } catch (e) {
      setError(e.message || 'Could not create desire');
    } finally { setSaving(false); }
  };

  const filtered = desires.filter((d) => categoryFilter === 'all' || d.category === categoryFilter);

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

            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Category (optional)</Text>
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

            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Intention (optional)</Text>
            <View style={[styles.inputBox, { minHeight: 70 }]}>
              <TextInput
                style={styles.input}
                placeholder="Feel into it... describe how it feels to already have this 🌸"
                placeholderTextColor="rgba(46,37,48,0.4)"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <Text style={[styles.fieldLbl, { marginTop: 12 }]}>Vision Image (optional)</Text>
            <TouchableOpacity style={styles.coverBtn} onPress={handleOpenImagePicker}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={styles.coverPreview} />
              ) : (
                <Text style={styles.coverBtnText}>🖼️ Choose from Vision Board / Mind Movies</Text>
              )}
            </TouchableOpacity>
            {coverUrl ? (
              <TouchableOpacity onPress={() => setCoverUrl(null)}><Text style={styles.removeCoverText}>✕ Remove image</Text></TouchableOpacity>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button title="🌙 Create Desire" onPress={handleCreate} loading={saving} fullWidth style={{ marginTop: 12 }} />
          </GlassCard>
        )}

        {imgPickerOpen && (
          <GlassCard style={{ marginBottom: 16 }}>
            <View style={styles.pickerHeadRow}>
              <Text style={styles.fieldLbl}>Choose an Image</Text>
              <TouchableOpacity onPress={() => setImgPickerOpen(false)}><Text style={styles.pickerClose}>✕</Text></TouchableOpacity>
            </View>
            {loadingImages ? (
              <ActivityIndicator color={colors.purpleMid} style={{ marginVertical: 16 }} />
            ) : availableImages.length === 0 ? (
              <Text style={styles.muted}>No images yet — add some to your Vision Board or Mind Movies first ✨</Text>
            ) : (
              <View style={styles.imgPickerGrid}>
                {availableImages.map((url) => (
                  <TouchableOpacity key={url} onPress={() => handlePickCover(url)}>
                    <Image source={{ uri: url }} style={styles.imgPickerCell} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </GlassCard>
        )}

        <View style={{ marginTop: 16, marginBottom: 16 }}>
          <Dropdown value={categoryFilter} options={CATEGORY_FILTER_OPTIONS} onSelect={setCategoryFilter} fullWidth />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 20 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🌙</Text>
            <Text style={styles.emptyTitle}>
              {desires.length === 0 ? 'Your first desire starts here' : 'Nothing in this category yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {desires.length === 0
                ? 'Name what you\'re calling in. Every affirmation, script, mind movie and vision board image can link back to it — so your whole practice points one way.'
                : 'Try another category, or create a desire here.'}
            </Text>
            {desires.length === 0 && (
              <View style={styles.emptySteps}>
                <Text style={styles.emptyStep}>✨  Name it — one clear sentence</Text>
                <Text style={styles.emptyStep}>🗓️  Give it a target date, if it has one</Text>
                <Text style={styles.emptyStep}>🖼️  Add a vision image from your board</Text>
              </View>
            )}
            {!addOpen && (
              <Button
                title="＋ Create your first desire"
                onPress={() => setAddOpen(true)}
                style={{ marginTop: 18 }}
              />
            )}
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((d) => (
              <TouchableOpacity key={d.id} style={[styles.card, { width: `${100 / COLS - 2}%` }]} onPress={() => router.push(`/desire/${d.id}`)}>
                <DesireCover uri={d.images?.[0]} style={styles.cardImage} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{d.title}</Text>
                  {d.category ? <Text style={styles.cardCategory}>{categoryLabel(d.category)}</Text> : null}
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardMeta}>{timeAgo(d.last_activity_at || d.updated_at || d.created_at)}</Text>
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
  inputBox: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: 10, textAlign: 'center' },

  coverBtn: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderStyle: 'dashed', borderRadius: radii.sm, padding: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.35)' },
  coverBtnText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist },
  coverPreview: { width: '100%', height: 100, borderRadius: radii.sm },
  removeCoverText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist2, marginTop: 6, textAlign: 'center' },

  pickerHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pickerClose: { fontSize: 16, color: colors.mist },
  imgPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imgPickerCell: { width: 80, height: 80, borderRadius: radii.sm },

  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, textAlign: 'center', marginTop: 20 },

  emptyWrap: {
    alignItems: 'center', paddingVertical: 34, paddingHorizontal: 26, marginTop: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(201,168,201,0.45)',
    borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.35)',
  },
  emptyIcon: { fontSize: 38, marginBottom: 12 },
  emptyTitle: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ink, textAlign: 'center' },
  emptyBody: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  emptySteps: { marginTop: 18, gap: 9, alignSelf: 'stretch' },
  emptyStep: { fontFamily: fonts.body, fontSize: 12.5, color: colors.ink2, lineHeight: 18 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' },
  card: { backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, overflow: 'hidden', marginBottom: 12 },
  // A fixed 100px cover read as a thin strip once cards got wider (2-col
  // on tablet); aspect-ratio scales the cover with the card like the
  // website's near-square hero image.
  cardImage: { width: '100%', aspectRatio: 1.05 },
  cardBody: { padding: 10 },
  cardTitle: { fontFamily: fonts.displayMedium, fontSize: 14, color: colors.ink, fontWeight: '600', marginBottom: 2 },
  cardCategory: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, marginBottom: 6 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMeta: { fontFamily: fonts.body, fontSize: 9.5, color: colors.mist2 },
});
