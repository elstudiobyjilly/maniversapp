import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Share } from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import TabPill from '../../components/TabPill';
import Button from '../../components/Button';
import ExpandableTextArea from '../../components/ExpandableTextArea';
import { colors, fonts, radii } from '../../constants/theme';
import { getLetGo, addLetGo, deleteLetGo } from '../../services/api';

const MOODS = [
  { id: 'anxious', ic: '😰', label: 'Anxious' },
  { id: 'attached', ic: '😟', label: 'Attached' },
  { id: 'neutral', ic: '😐', label: 'Neutral' },
  { id: 'releasing', ic: '🌿', label: 'Releasing' },
  { id: 'trusting', ic: '✨', label: 'Trusting' },
  { id: 'detached', ic: '🍃', label: 'Detached' },
];

const TIPS = [
  { title: 'The Paradox of Detachment', body: 'The universe gives most freely to those who no longer need it to. Detachment is not giving up on your desire — it is giving up your grip on it. The tighter you hold, the more it slips away. Open your hands and see what lands in them.' },
  { title: 'Feel It Then Free It', body: 'You are allowed to want what you want. Feel that desire fully — then consciously choose to release it. Say: "I want this deeply. And I trust it is coming. I do not need to know how or when." This is the dance of manifestation.' },
  { title: 'Attachment is Fear in Disguise', body: "When we are attached to an outcome, what we are really attached to is a fear — that we won't be okay without it. The deeper work is healing that fear. When you genuinely know you will be okay either way, the desire often arrives." },
  { title: 'Signs of Healthy Detachment', body: 'You think about your desire without the tight feeling in your chest. You can talk about it calmly. You notice signs with curiosity, not desperation. You are living your life fully, not waiting for your life to begin.' },
  { title: 'The Watched Pot', body: 'Have you ever noticed that when you stop obsessively checking your phone, the message arrives? This is the energetics of detachment in action. Step away from the monitoring. Live your life. Let it find you.' },
  { title: 'Trust as a Practice', body: 'Trust is not a feeling that arrives spontaneously. It is a choice you make repeatedly. Each time anxiety rises, you choose: "I trust this." Not blindly — but deliberately. Over time, trust becomes your default. And that is when magic accelerates.' },
  { title: 'Your Worth is Not Your Manifestation', body: 'If your desire does not arrive, you are still whole. Your value as a person is not conditional on what you manifest. Knowing this — deeply, in your body — is the most liberating detachment of all.' },
];

function moodPrefix(mood) {
  const m = MOODS.find((x) => x.id === mood);
  return m ? `${m.ic} ${m.label}` : '';
}

export default function LetGo() {
  const [tab, setTab] = useState('checkin'); // 'checkin' | 'log' | 'tips'
  const [mood, setMood] = useState(null);
  const [trigger, setTrigger] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logged, setLogged] = useState(false);

  const load = async () => {
    try { setList(await getLetGo()); } catch (e) { setError(e.message || 'Could not load entries'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleLog = async () => {
    if (!mood) { setError('Choose how you\'re feeling first.'); return; }
    setError(''); setSaving(true);
    try {
      const content = trigger.trim() ? `${moodPrefix(mood)} ${trigger.trim()}` : moodPrefix(mood);
      const row = await addLetGo(content);
      setList((prev) => [row, ...prev]);
      setMood(null); setTrigger('');
      setLogged(true);
      setTimeout(() => setLogged(false), 2500);
    } catch (e) {
      setError(e.message || 'Could not save entry');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteLetGo(id); setList((prev) => prev.filter((e) => e.id !== id)); } catch (_) {}
  };

  const handleShare = async (content) => {
    try { await Share.share({ message: content }); } catch (_) {}
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader lead="Let" accent="Go" subtitle="Detachment is not giving up. It is trusting completely. 🌿" />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'checkin', label: '🌿 Check In' },
            { value: 'log', label: '📓 My Log' },
            { value: 'tips', label: '💡 Tips' },
          ]}
        />

        {tab === 'checkin' ? (
          <>
            <GlassCard style={styles.mb20}>
              <Text style={styles.intro}>How are you feeling about your desire today?</Text>
              <Text style={styles.introSub}>Be honest. No judgment. This is your space.</Text>

              <View style={styles.moodRow}>
                {MOODS.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.moodChip, mood === m.id && styles.moodChipActive]}
                    onPress={() => setMood(m.id)}
                  >
                    <Text style={[styles.moodChipText, mood === m.id && styles.moodChipTextActive]}>{m.ic} {m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ExpandableTextArea
                value={trigger}
                onChangeText={setTrigger}
                placeholder="What triggered this feeling? What are you holding on to?..."
                modalTitle="Let Go"
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              {logged && <Text style={styles.loggedText}>Logged ✨</Text>}
              <Button title="+ Log This Moment" onPress={handleLog} loading={saving} style={{ marginTop: 4, alignSelf: 'flex-start' }} />
            </GlassCard>

            <GlassCard>
              <Text style={styles.practiceHeading}>🌿 Today's Detachment Practice</Text>
              <Text style={styles.practiceBody}>"Do something today purely for enjoyment — with no connection to your desire. Just live. Just be present. This is active detachment."</Text>
            </GlassCard>
          </>
        ) : tab === 'log' ? (
          loading ? (
            <ActivityIndicator color="#c9a8c9" style={{ marginTop: 20 }} />
          ) : list.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🌬️</Text>
              <Text style={styles.emptyTitle}>Nothing logged yet</Text>
              <Text style={styles.emptySubtitle}>Your check-ins will appear here</Text>
            </GlassCard>
          ) : (
            <>
              <Text style={styles.sectionHeading}>Your Detachment Journey</Text>
              {list.map((item) => (
                <GlassCard key={item.id} style={styles.logCard}>
                  <Text style={styles.logLabel}>🌿 Note</Text>
                  <Text style={styles.logText}>"{item.content}"</Text>
                  <View style={styles.logFooter}>
                    <Text style={styles.logDate}>{item.created_at ? new Date(item.created_at).toDateString() : ''}</Text>
                    <View style={styles.logActions}>
                      <TouchableOpacity style={styles.logActionBtn} onPress={() => handleShare(item.content)}>
                        <Text style={styles.logActionText}>📤 Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.logActionBtnDanger} onPress={() => handleDelete(item.id)}>
                        <Text style={styles.logActionIcon}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </GlassCard>
              ))}
            </>
          )
        ) : (
          TIPS.map((t, i) => (
            <GlassCard key={i} style={{ marginBottom: 12 }}>
              <Text style={styles.tipTitle}>{t.title}</Text>
              <Text style={styles.tipBody}>{t.body}</Text>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  mb20: { marginBottom: 20 },

  intro: { color: '#2e2530', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  introSub: { color: '#6b5c66', fontSize: 12.5, marginBottom: 16 },

  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  moodChip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', backgroundColor: 'rgba(255,255,255,0.6)' },
  moodChipActive: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  moodChipText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2, fontWeight: '500' },
  moodChipTextActive: { color: '#fff', fontWeight: '700' },

  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#2e2530',
    minHeight: 90,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
    textAlignVertical: 'top',
  },
  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  loggedText: { color: '#7da888', fontSize: 13, marginBottom: 10, textAlign: 'center', fontWeight: '600' },

  practiceHeading: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink, fontWeight: '600', marginBottom: 10 },
  practiceBody: { fontFamily: fonts.displayItalic, fontSize: 14.5, color: colors.ink2, fontStyle: 'italic', lineHeight: 22 },

  sectionHeading: { fontSize: 15, color: '#2e2530', fontWeight: '600', marginBottom: 12 },
  logCard: { marginBottom: 12 },
  logLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, fontWeight: '700', marginBottom: 6 },
  logText: { fontFamily: fonts.displayItalic, fontSize: 14.5, color: colors.ink2, fontStyle: 'italic', lineHeight: 21, marginBottom: 10 },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logDate: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist },
  logActions: { flexDirection: 'row', gap: 8 },
  logActionBtn: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 12 },
  logActionText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.ink2, fontWeight: '600' },
  logActionBtnDanger: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder, borderRadius: radii.pill, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  logActionIcon: { fontSize: 12 },

  tipTitle: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ink, fontWeight: '600', marginBottom: 8 },
  tipBody: { fontFamily: fonts.body, fontSize: 13.5, color: colors.ink2, lineHeight: 20 },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6b5c66' },
});
