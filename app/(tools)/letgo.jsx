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
import { getLetGo, addLetGo, deleteLetGo } from '../../services/api';

// ─── Single entry row with release animation ──────────────────────────────
function LetGoEntry({ item, onReleased }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [releasing, setReleasing] = useState(false);

  const handleRelease = () => {
    if (releasing) return;
    setReleasing(true);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.88, duration: 500, useNativeDriver: true }),
    ]).start(async () => {
      try { await deleteLetGo(item.id); } catch (_) {}
      onReleased(item.id);
    });
  };

  return (
    <Animated.View style={{ opacity, transform: [{ scale }], marginBottom: 10 }}>
      <GlassCard style={styles.entryCard}>
        <View style={styles.entryRow}>
          <Text style={styles.entryText}>{item.content}</Text>
          <TouchableOpacity
            onPress={handleRelease}
            disabled={releasing}
            style={styles.releaseBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.releaseBtnIcon}>🕊️</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function LetGo() {
  const [entry, setEntry] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [released, setReleased] = useState(false);

  const load = async () => {
    try { setList(await getLetGo()); } catch (e) { setError(e.message || 'Could not load entries'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleRelease = async () => {
    if (!entry.trim()) { setError('Write what you want to let go of.'); return; }
    setError(''); setSaving(true);
    try {
      const row = await addLetGo(entry.trim());
      setList((prev) => [row, ...prev]);
      setEntry('');
      setReleased(true);
      setTimeout(() => setReleased(false), 2500);
    } catch (e) {
      setError(e.message || 'Could not save entry');
    } finally { setSaving(false); }
  };

  const handleEntryReleased = (id) => {
    setList((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Title */}
        <ScreenHeader lead="Let" accent="Go" subtitle={`Write it down. Release it. 🕊️`} />

        {/* Input card */}
        <GlassCard style={styles.mb20}>
          <Text style={styles.intro}>What are you ready to release today?</Text>
          <TextInput
            style={styles.input}
            placeholder="Write it here — it's safe to let this go..."
            placeholderTextColor="#9a8896"
            value={entry}
            onChangeText={setEntry}
            multiline
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {released && <Text style={styles.releasedText}>Released ✨</Text>}
          <Button title="Let It Go 🕊️" onPress={handleRelease} loading={saving} fullWidth style={{ marginTop: 4 }} />
        </GlassCard>

        {/* Past entries */}
        {loading ? (
          <ActivityIndicator color="#c9a8c9" style={{ marginTop: 20 }} />
        ) : list.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🌬️</Text>
            <Text style={styles.emptyTitle}>Nothing released yet</Text>
            <Text style={styles.emptySubtitle}>Your releases will appear here</Text>
          </GlassCard>
        ) : (
          <>
            <Text style={styles.sectionHeading}>Released</Text>
            {list.map((item) => (
              <LetGoEntry
                key={item.id}
                item={item}
                onReleased={handleEntryReleased}
              />
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
    minHeight: 80,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
    textAlignVertical: 'top',
  },
  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  releasedText: { color: '#7da888', fontSize: 13, marginBottom: 10, textAlign: 'center', fontWeight: '600' },

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
  releaseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.2)',
    marginTop: 1,
  },
  releaseBtnIcon: { fontSize: 14 },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6b5c66' },
});