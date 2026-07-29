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
import { getScripts, addScript, updateScript, deleteScript } from '../../services/api';

// ─── Single script entry with edit + delete ───────────────────────────────────
function ScriptEntry({ item, onEdit, onDeleted }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    if (deleting) return;
    setDeleting(true);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.88, duration: 450, useNativeDriver: true }),
    ]).start(async () => {
      try { await deleteScript(item.id); } catch (_) {}
      onDeleted(item.id);
    });
  };

  return (
    <Animated.View style={{ opacity, transform: [{ scale }], marginBottom: 12 }}>
      <GlassCard>
        {/* Date + action row */}
        <View style={styles.entryHeader}>
          <Text style={styles.dateText}>{item.script_date}</Text>
          <View style={styles.entryActions}>
            <TouchableOpacity
              onPress={() => onEdit(item)}
              style={styles.actionBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              style={[styles.actionBtn, styles.actionBtnDelete]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.entryText}>{item.content}</Text>
      </GlassCard>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Scripting() {
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null); // null = new, id = editing existing
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const inputRef = useRef(null);

  const load = async () => {
    try { setList(await getScripts()); } catch (e) { setError(e.message || 'Could not load'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  // Open an entry in the input box for editing
  const handleEdit = (item) => {
    setContent(item.content);
    setEditingId(item.id);
    setError('');
    setSaved(false);
    // Scroll to top / focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCancel = () => {
    setContent('');
    setEditingId(null);
    setError('');
  };

  const handleSave = async () => {
    if (!content.trim()) { setError('Write your script for the day.'); return; }
    setError(''); setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const updated = await updateScript(editingId, content.trim());
        setList((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...updated } : s)));
      } else {
        // Add new
        const row = await addScript(content.trim());
        setList((prev) => [row, ...prev]);
      }
      setContent('');
      setEditingId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message || 'Could not save');
    } finally { setSaving(false); }
  };

  const handleDeleted = (id) => {
    setList((prev) => prev.filter((s) => s.id !== id));
    // If we were editing the deleted entry, clear the form
    if (editingId === id) handleCancel();
  };

  const isEditing = editingId !== null;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <ScreenHeader lead="Script" accent="ing" subtitle={`Write your day as if it already happened ✨`} />

        {/* Input card */}
        <GlassCard style={styles.mb20}>
          {isEditing && (
            <View style={styles.editingBadge}>
              <Text style={styles.editingBadgeText}>Editing script</Text>
              <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          {!isEditing && (
            <Text style={styles.intro}>Script your ideal day in the past tense</Text>
          )}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Today was absolutely incredible. I woke up feeling..."
            placeholderTextColor="#9a8896"
            value={content}
            onChangeText={setContent}
            multiline
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {saved && <Text style={styles.confirmedText}>{isEditing ? 'Updated ✨' : 'Saved ✨'}</Text>}
          <Button title={isEditing ? 'Update Script ✨' : 'Save Script ✨'} onPress={handleSave} loading={saving} fullWidth style={{ marginTop: 4 }} />
        </GlassCard>

        {/* Script list */}
        {loading ? (
          <ActivityIndicator color="#c9a8c9" style={{ marginTop: 20 }} />
        ) : list.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={styles.emptyTitle}>No scripts yet</Text>
            <Text style={styles.emptySubtitle}>Your scripted days will appear here</Text>
          </GlassCard>
        ) : (
          <>
            <Text style={styles.sectionHeading}>Your scripts</Text>
            {list.map((item) => (
              <ScriptEntry
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDeleted={handleDeleted}
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

  editingBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(154,95,168,0.15)',
  },
  editingBadgeText: { fontSize: 12, color: '#9a5fa8', fontWeight: '600', letterSpacing: 0.4 },
  cancelText: { fontSize: 12, color: '#9a8896', fontWeight: '500' },

  intro: { color: '#6b5c66', fontSize: 13, fontWeight: '500', marginBottom: 14, textAlign: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2e2530',
    minHeight: 130,
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

  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: { fontSize: 11, color: '#9a8896', fontWeight: '500' },
  entryActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.2)',
  },
  actionBtnDelete: {
    borderColor: 'rgba(192,64,64,0.2)',
  },
  editBtnText: { fontSize: 11, color: '#9a5fa8', fontWeight: '600' },
  deleteBtnText: { fontSize: 11, color: '#9a8896', fontWeight: '600' },

  entryText: { color: '#2e2530', fontSize: 14, lineHeight: 22 },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6b5c66' },
});