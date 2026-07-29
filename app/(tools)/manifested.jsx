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
import { getManifested, addManifested, deleteManifested } from '../../services/api';

// ─── Single win entry with checkmark-pulse delete ─────────────────────────────
function WinEntry({ item, onDeleted }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    if (deleting) return;
    setDeleting(true);
    // Brief celebratory pulse up, then fade out
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.04, useNativeDriver: true, speed: 40 }),
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.9, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(async () => {
      try { await deleteManifested(item.id); } catch (_) {}
      onDeleted(item.id);
    });
  };

  return (
    <Animated.View style={{ opacity, transform: [{ scale }], marginBottom: 10 }}>
      <GlassCard>
        <View style={styles.entryRow}>
          <View style={styles.entryBody}>
            <Text style={styles.entryTitle}>✨ {item.title}</Text>
            {!!item.note && <Text style={styles.entryNote}>{item.note}</Text>}
          </View>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={styles.archiveBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.archiveBtnText}>✓</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Manifested() {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  const load = async () => {
    try { setList(await getManifested()); } catch (e) { setError(e.message || 'Could not load'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleAdd = async () => {
    if (!title.trim()) { setError('What did you manifest?'); return; }
    setError(''); setSaving(true);
    try {
      const row = await addManifested({ title: title.trim(), note: note.trim() });
      setList((prev) => [row, ...prev]);
      setTitle(''); setNote('');
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (e) {
      setError(e.message || 'Could not save');
    } finally { setSaving(false); }
  };

  const handleDeleted = (id) => {
    setList((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <ScreenHeader lead="Mani" accent="fested" subtitle={`Log every win — big or small ✨`} />

        {/* Input card */}
        <GlassCard style={styles.mb20}>
          <Text style={styles.intro}>Celebrate what you've called in</Text>
          <TextInput
            style={styles.input}
            placeholder="What manifested?"
            placeholderTextColor="#9a8896"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
            placeholder="Add a note (optional)"
            placeholderTextColor="#9a8896"
            value={note}
            onChangeText={setNote}
            multiline
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {added && <Text style={styles.confirmedText}>Logged ✨</Text>}
          <Button title="Add Win ✨" onPress={handleAdd} loading={saving} fullWidth style={{ marginTop: 4 }} />
        </GlassCard>

        {/* Win list */}
        {loading ? (
          <ActivityIndicator color="#c9a8c9" style={{ marginTop: 20 }} />
        ) : list.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>No wins logged yet</Text>
            <Text style={styles.emptySubtitle}>Your manifestations will appear here</Text>
          </GlassCard>
        ) : (
          <>
            <Text style={styles.sectionHeading}>Your wins</Text>
            {list.map((item) => (
              <WinEntry key={item.id} item={item} onDeleted={handleDeleted} />
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
    fontSize: 14,
    color: '#2e2530',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
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

  entryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  entryBody: { flex: 1, marginRight: 10 },
  entryTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 3 },
  entryNote: { color: '#6b5c66', fontSize: 13, lineHeight: 18 },

  archiveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(201,168,201,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  archiveBtnText: { fontSize: 13, color: '#9a5fa8', fontWeight: '700' },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6b5c66' },
});