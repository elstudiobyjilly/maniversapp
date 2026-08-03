import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { getDesires, updateDesire, deleteDesire } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii } from '../../constants/theme';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { limits, loaded: planLoaded, plan, refresh: refreshPlan } = usePlanStore();
  const [desires, setDesires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDesires = async () => {
    try {
      const d = await getDesires();
      setDesires(Array.isArray(d) ? d.filter(x => x.status === 'active') : []);
    } catch (_) {}
  };

  useEffect(() => {
    refreshPlan();
    loadDesires().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDesires();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const openEdit = (d) => {
    setEditing(d);
    setEditTitle(d.title || '');
    setEditDesc(d.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editTitle.trim()) { Alert.alert('Enter your desire ✨'); return; }
    setSaving(true);
    try {
      await updateDesire(editing.id, { title: editTitle.trim(), description: editDesc.trim() });
      setDesires((prev) => prev.map((d) => (d.id === editing.id ? { ...d, title: editTitle.trim(), description: editDesc.trim() } : d)));
      setEditing(null);
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  const handleSetStatus = async (status) => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateDesire(editing.id, { status });
      setDesires((prev) => prev.filter((d) => d.id !== editing.id));
      setEditing(null);
      Alert.alert(status === 'manifested' ? 'Desire marked manifested ✨' : 'Desire released 🕊️');
    } catch (e) {
      Alert.alert('Could not update', e.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert('Delete this desire?', 'This also removes its linked items count.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setSaving(true);
        try {
          await deleteDesire(editing.id);
          setDesires((prev) => prev.filter((d) => d.id !== editing.id));
          setEditing(null);
        } catch (e) {
          Alert.alert('Could not delete', e.message || 'Please try again.');
        } finally { setSaving(false); }
      } },
    ]);
  };

  const aiUsage = user?.ai_usage || {};
  const aiMonthlyCap = limits?.ai_affirmations;
  const affUsed = aiUsage.affirmations || 0;
  const affLeft = typeof aiMonthlyCap === 'number' ? Math.max(0, aiMonthlyCap - affUsed) : null;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purpleMid} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome, <Text style={styles.greetingAccent}>{user?.full_name?.split(' ')[0] || user?.username}</Text> 🌸</Text>
          <Text style={styles.planBadge}>{user?.plan?.toUpperCase()} · {user?.plan_status}</Text>
        </View>

        <GlassCard style={styles.cardMargin}>
          <Text style={styles.cardTitle}>Active Desires</Text>
          {loading ? (
            <Text style={styles.muted}>Loading...</Text>
          ) : desires.length === 0 ? (
            <Text style={styles.muted}>No active desires yet — start manifesting ✨</Text>
          ) : (
            desires.map((d) => (
              <TouchableOpacity key={d.id} style={styles.desireRow} onPress={() => openEdit(d)}>
                <Text style={styles.desireTitle}>{d.title}</Text>
                <Text style={styles.desireMeta}>
                  {Object.values(d.link_counts || {}).reduce((a, b) => a + b, 0)} linked items · tap to manage
                </Text>
              </TouchableOpacity>
            ))
          )}
        </GlassCard>

        {planLoaded && plan === 'free' && (
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.cardTitle}>AI Affirmations</Text>
            <Text style={styles.muted}>AI-generated affirmations are a Basic Manifestor feature -- try Write Your Own for free, or upgrade for AI generation.</Text>
          </GlassCard>
        )}
        {planLoaded && plan !== 'free' && aiMonthlyCap != null && (
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.cardTitle}>AI Usage This Month</Text>
            <Text style={styles.muted}>{affLeft} / {aiMonthlyCap} affirmation generations left</Text>
          </GlassCard>
        )}

        <Button title="Log out" variant="danger" onPress={handleLogout} style={{ alignSelf: 'center', marginTop: 8, marginBottom: 40 }} />
      </ScrollView>

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Manage Desire</Text>

            <View style={styles.inputBox}>
              <TextInput style={styles.input} placeholder="Desire title" placeholderTextColor="rgba(46,37,48,0.4)" value={editTitle} onChangeText={setEditTitle} />
            </View>
            <View style={[styles.inputBox, { marginTop: 10, minHeight: 70 }]}>
              <TextInput
                style={styles.input}
                placeholder="Description (optional)"
                placeholderTextColor="rgba(46,37,48,0.4)"
                multiline
                value={editDesc}
                onChangeText={setEditDesc}
              />
            </View>

            <Button title="Save Changes" onPress={handleSaveEdit} loading={saving} fullWidth style={{ marginTop: 14 }} />

            <View style={styles.statusRow}>
              <Button title="✨ Mark Manifested" variant="ghost" onPress={() => handleSetStatus('manifested')} style={{ flex: 1 }} />
              <Button title="🕊️ Release" variant="ghost" onPress={() => handleSetStatus('released')} style={{ flex: 1 }} />
            </View>

            <Button title="Delete Desire" variant="danger" fullWidth onPress={handleDelete} style={{ marginTop: 8 }} />

            <TouchableOpacity onPress={() => setEditing(null)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { padding: 24, paddingTop: 50, alignItems: 'center' },
  greeting: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: 6, textAlign: 'center', fontWeight: '400' },
  greetingAccent: { fontFamily: fonts.displayItalic, color: colors.purpleDark, fontWeight: '500', fontStyle: 'italic' },
  planBadge: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.mist, letterSpacing: 1 },
  cardMargin: { marginHorizontal: 20, marginBottom: 16 },
  cardTitle: { fontFamily: fonts.displayMedium, fontSize: 16, fontWeight: '600', color: colors.ink, marginBottom: 12 },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, lineHeight: 19 },
  desireRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.15)' },
  desireTitle: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 14, fontWeight: '500' },
  desireMeta: { fontFamily: fonts.body, color: colors.mist, fontSize: 12, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(46,37,48,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fffaf3', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalTitle: { fontFamily: fonts.displayMedium, fontSize: 19, fontWeight: '400', color: colors.ink, marginBottom: 16 },
  inputBox: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelText: { fontFamily: fonts.body, color: colors.mist, fontSize: 13.5, fontWeight: '500' },
});
