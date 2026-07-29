import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import { addGratitude, getGratitudeList, deleteGratitude } from '../../services/api';

// ─── Single entry with close animation ───────────────────────────────────────
function GratitudeEntry({ item, onRemoved }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [removing, setRemoving] = useState(false);

  const handleRemove = () => {
    if (removing) return;
    setRemoving(true);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.88, duration: 450, useNativeDriver: true }),
    ]).start(async () => {
      try { await deleteGratitude(item.id); } catch (_) {}
      onRemoved(item.id);
    });
  };

  return (
    <Animated.View style={{ opacity, transform: [{ scale }], marginBottom: 10 }}>
      <GlassCard style={styles.entryCard}>
        <View style={styles.entryRow}>
          <Text style={styles.entryText}>{item.content}</Text>
          <TouchableOpacity
            onPress={handleRemove}
            disabled={removing}
            style={styles.removeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.removeBtnIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Gratitude() {
  const [entry, setEntry] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  const load = async () => {
    try { setList(await getGratitudeList()); } catch (e) { setError(e.message || 'Could not load entries'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleAdd = async () => {
    if (!entry.trim()) { setError('Write something you are grateful for.'); return; }
    setError(''); setSaving(true);
    try {
      const row = await addGratitude(entry.trim());
      setList((prev) => [row, ...prev]);
      setEntry('');
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (e) {
      setError(e.message || 'Could not save entry');
    } finally { setSaving(false); }
  };

  const handleRemoved = (id) => {
    setList((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>

        <ScreenHeader lead="Grat" accent="itude" subtitle={`Notice what's already good ✨`} />

        {/* Input card */}
        <GlassCard style={styles.mb20}>
          <Text style={styles.intro}>What are you grateful for today?</Text>
          <TextInput
            style={styles.input}
            placeholder="I am grateful for..."
            placeholderTextColor="#9a8896"
            value={entry}
            onChangeText={setEntry}
            multiline
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {added && <Text style={styles.confirmedText}>Added ✨</Text>}
          <Button title="Add Entry ✨" onPress={handleAdd} loading={saving} fullWidth style={{ marginTop: 4 }} />
        </GlassCard>

        {/* Entry list */}
        {loading ? (
          <ActivityIndicator color="#c9a8c9" style={{ marginTop: 20 }} />
        ) : list.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🌸</Text>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptySubtitle}>Your gratitude list will grow here</Text>
          </GlassCard>
        ) : (
          <>
            <Text style={styles.sectionHeading}>Your gratitude list</Text>
            {list.map((item) => (
              <GratitudeEntry key={item.id} item={item} onRemoved={handleRemoved} />
            ))}
          </>
        )}

      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },

  mb20: { marginBottom: 20 },

  intro: { color: '#6b5c66', fontSize: 13, fontWeight: '500', marginBottom: 14, textAlign: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#2e2530',
    minHeight: 70,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
    textAlignVertical: 'top',
  },
  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  confirmedText: { color: '#7da888', fontSize: 13, marginBottom: 10, textAlign: 'center', fontWeight: '600' },

  sectionHeading: {
    fontSize: 11,
    color: '#9a5fa8',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  entryCard: {},
  entryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  entryText: { color: '#2e2530', fontSize: 14, lineHeight: 20, flex: 1, marginRight: 8 },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.2)',
    marginTop: 1,
  },
  removeBtnIcon: { fontSize: 11, color: '#9a8896', fontWeight: '600' },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6b5c66' },
});