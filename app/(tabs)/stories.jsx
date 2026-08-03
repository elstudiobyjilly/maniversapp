import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { Audio } from 'expo-av';
import {
  generateStory, saveOwnStory, getStories, getItemAudio,
  favoriteStory, pinStory, deleteStory, regenerateStory,
  getStoryAudioStatus, getStoryPlaysToday, addStoryPlay, createCheckout,
  updateStoryTitle, updateStoryContent, regenerateStoryAudio, getStoryUsage,
} from '../../services/api';
import LinkDesireButton from '../../components/LinkDesireButton';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import TabPill from '../../components/TabPill';
import Chip from '../../components/Chip';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii } from '../../constants/theme';
import * as Linking from 'expo-linking';

const LENGTHS = [
  { value: 'short', label: 'Short (~150 words)' },
  { value: 'medium', label: 'Medium (~300 words)' },
  { value: 'long', label: 'Long (~500 words)' },
];

const MODES = [
  { value: 'i_am', label: '💗 I Am' },
  { value: 'you_are', label: '✨ You Are' },
  { value: 'background', label: '🎧 Background' },
  { value: 'trance', label: '🌀 Trance' },
  { value: 'mix', label: '🎛️ Mix' },
];

const VOICES = [
  { id: 'luna', label: '🌸 Luna' },
  { id: 'orion', label: '🌙 Orion' },
  { id: 'sage', label: '🍃 Sage' },
];

export default function Stories() {
  const { limits, loaded, hasFeature, refresh } = usePlanStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  const [tab, setTab] = useState('manifest'); // 'manifest' | 'write'
  const [libFilter, setLibFilter] = useState('ai'); // 'ai' | 'own'

  const [desire, setDesire] = useState('');
  const [length, setLength] = useState('short');
  const [mode, setMode] = useState('');
  const [voice, setVoice] = useState('luna');
  const [generating, setGenerating] = useState(false);

  const [ownTitle, setOwnTitle] = useState('');
  const [ownContent, setOwnContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [library, setLibrary] = useState([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(null);
  const [playsToday, setPlaysToday] = useState(null);
  const [usage, setUsage] = useState(null);

  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editVoice, setEditVoice] = useState('luna');
  const [editSaving, setEditSaving] = useState(false);
  const [regenAudioLoading, setRegenAudioLoading] = useState(false);

  const canGenerateAi = hasFeature('ai_stories');
  const ownStoriesTotal = library.filter((s) => s.source !== 'ai').length;
  const ownCap = limits?.own_stories_total;

  const handleSelectPlan = async (priceKey) => {
    try {
      const res = await createCheckout(priceKey);
      if (res?.url) await Linking.openURL(res.url);
    } catch (e) {
      setError(e.message || 'Could not start checkout');
    }
  };

  const loadLibrary = async () => {
    try { setLibrary(await getStories()); } catch (_) {} finally { setLoadingLib(false); }
  };

  const loadPlaysToday = async () => {
    try { setPlaysToday(await getStoryPlaysToday()); } catch (_) {}
  };

  const loadUsage = async () => {
    try { setUsage(await getStoryUsage()); } catch (_) {}
  };

  useEffect(() => {
    refresh();
    loadLibrary();
    loadPlaysToday();
    loadUsage();
  }, []);

  const stopSound = async () => { if (sound) { try { await sound.unloadAsync(); } catch (_) {} } setSound(null); setPlayingId(null); };

  const handleGenerate = async () => {
    if (!canGenerateAi) {
      setUpgradeMsg('AI-generated stories are a Basic Manifestor feature. Try Write Your Own for free, or upgrade for AI stories in your chosen voice.');
      setShowUpgrade(true);
      return;
    }
    if (!desire.trim()) { setError('Describe your desire as if it has already arrived.'); return; }
    setError(''); setGenerating(true);
    try {
      const story = await generateStory(desire.trim(), { length, theme: 'general', story_mode: mode, voice_id: voice });
      setLibrary((prev) => [story, ...prev]);
      setDesire('');
      loadUsage();
    } catch (e) {
      if (e.status === 403) { setUpgradeMsg(e.message || 'Upgrade to generate AI stories.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not generate story');
    } finally { setGenerating(false); }
  };

  const handleSaveOwn = async () => {
    if (!ownContent.trim()) { setError('Write your story first.'); return; }
    if (ownCap != null && ownStoriesTotal >= ownCap) {
      setUpgradeMsg(`You've used all ${ownCap} of your free own stories -- upgrade for more room.`);
      setShowUpgrade(true);
      return;
    }
    setError(''); setSaving(true);
    try {
      const story = await saveOwnStory({ title: ownTitle.trim() || 'My Story', content: ownContent.trim(), voice_id: voice });
      setLibrary((prev) => [story, ...prev]);
      setOwnTitle(''); setOwnContent('');
      loadUsage();
    } catch (e) {
      if (e.status === 403) { setUpgradeMsg(e.message || 'Upgrade for more own stories.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not save story');
    } finally { setSaving(false); }
  };

  const handlePlay = async (story) => {
    if (story.locked) {
      setUpgradeMsg('This story is locked -- upgrade to play it again, or free up a slot.');
      setShowUpgrade(true);
      return;
    }
    if (playsToday && playsToday.limit != null && playsToday.used >= playsToday.limit) {
      setUpgradeMsg(`You've reached your ${playsToday.limit} free story plays today -- upgrade for unlimited plays.`);
      setShowUpgrade(true);
      return;
    }

    await stopSound();
    setPlayingId(story.id); setError('');
    try {
      let uri = story.audio_url;
      if (!uri) {
        try {
          const status = await getStoryAudioStatus(story.id);
          uri = status?.audio_url;
        } catch (_) {}
      }
      if (!uri) {
        uri = await getItemAudio('story', story.id, story.content, voice);
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setPlayingId(null); });
      try { await addStoryPlay(); loadPlaysToday(); } catch (_) {}
    } catch (e) {
      if (e.status === 403 || e.status === 429) { setUpgradeMsg(e.message || 'Upgrade for unlimited story plays.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not play audio');
      setPlayingId(null);
    }
  };

  const handleFavorite = async (id) => { try { await favoriteStory(id); loadLibrary(); } catch (_) {} };
  const handlePin = async (id) => { try { await pinStory(id); loadLibrary(); } catch (_) {} };
  const handleDelete = async (id) => { try { await deleteStory(id); setLibrary((l) => l.filter((s) => s.id !== id)); } catch (_) {} };
  const handleRegenerate = async (id) => { try { await regenerateStory(id); } catch (e) { setError(e.message || 'Regenerate failed'); } };

  const openEdit = (story) => {
    setEditing(story);
    setEditTitle(story.title || '');
    setEditContent(story.content || '');
    setEditVoice(story.voice_id || 'luna');
  };

  const handleSaveEditTitle = async () => {
    if (!editing) return;
    if (!editTitle.trim()) { Alert.alert('Enter a title ✨'); return; }
    setEditSaving(true);
    try {
      await updateStoryTitle(editing.id, editTitle.trim());
      setLibrary((prev) => prev.map((s) => (s.id === editing.id ? { ...s, title: editTitle.trim() } : s)));
      setEditing((prev) => (prev ? { ...prev, title: editTitle.trim() } : prev));
    } catch (e) {
      Alert.alert('Could not rename', e.message || 'Please try again.');
    } finally { setEditSaving(false); }
  };

  const handleSaveEditContent = async () => {
    if (!editing) return;
    if (!editContent.trim()) { Alert.alert('Story text can\'t be empty ✨'); return; }
    setEditSaving(true);
    try {
      const updated = await updateStoryContent(editing.id, editContent.trim(), editTitle.trim(), editVoice);
      setLibrary((prev) => prev.map((s) => (s.id === editing.id ? { ...s, ...updated, content: editContent.trim() } : s)));
      setEditing(null);
      Alert.alert('Story updated ✨');
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Please try again.');
    } finally { setEditSaving(false); }
  };

  const handleRegenerateVoice = async () => {
    if (!editing) return;
    setRegenAudioLoading(true);
    try {
      await regenerateStoryAudio(editing.id, editVoice);
      setLibrary((prev) => prev.map((s) => (s.id === editing.id ? { ...s, voice_id: editVoice, audio_url: null } : s)));
      Alert.alert('Voice changed — audio is regenerating ✨');
    } catch (e) {
      Alert.alert('Could not change voice', e.message || 'Please try again.');
    } finally { setRegenAudioLoading(false); }
  };

  const filteredLibrary = library.filter((s) => (libFilter === 'ai' ? s.source === 'ai' : s.source !== 'ai'));

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <ScreenHeader lead="Manifest" accent="Stories" subtitle="Generate, write or play stories as if your desire has already arrived. ✨" />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'manifest', label: '📖 Manifest' },
            { value: 'write', label: '✍️ Write Own' },
          ]}
        />

        {tab === 'manifest' ? (
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.helperText}>Describe your desire and Luna writes a vivid present-tense story as if it has already arrived.</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="e.g. I have found my soulmate and we share a deep, joyful, passionate love..."
                placeholderTextColor="rgba(46,37,48,0.4)"
                value={desire}
                onChangeText={setDesire}
                multiline
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>LENGTH</Text>
            <View style={styles.chipRow}>
              {LENGTHS.map((l) => (
                <Chip key={l.value} label={l.label} active={length === l.value} onPress={() => setLength(l.value)} />
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>STORY STYLE (OPTIONAL)</Text>
            <View style={styles.chipRow}>
              {MODES.map((m) => (
                <Chip key={m.value} label={m.label} active={mode === m.value} onPress={() => setMode(mode === m.value ? '' : m.value)} />
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>VOICE</Text>
            <View style={styles.chipRow}>
              {VOICES.map((v) => (
                <Chip key={v.id} label={v.label} active={voice === v.id} onPress={() => setVoice(v.id)} />
              ))}
            </View>

            {loaded && !canGenerateAi ? (
              <Text style={styles.upsellHint}>✨ AI story generation is a Basic Manifestor feature — write your own for free, or upgrade.</Text>
            ) : null}
            {canGenerateAi && usage?.month_limit != null ? (
              <Text style={styles.usageHint}>{usage.month_used ?? 0} / {usage.month_limit} AI stories used this month</Text>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button title="Generate My Story ✨" onPress={handleGenerate} loading={generating} fullWidth style={{ marginTop: 14 }} />
          </GlassCard>
        ) : (
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.helperText}>Write in present tense, as if it has already happened. Vivid. Felt. Real.</Text>
            <View style={styles.inputBoxSm}>
              <TextInput
                style={styles.input}
                placeholder="Story title (shown in library)..."
                placeholderTextColor="rgba(46,37,48,0.4)"
                value={ownTitle}
                onChangeText={setOwnTitle}
              />
            </View>
            <View style={[styles.inputBox, { marginTop: 8, minHeight: 140 }]}>
              <TextInput
                style={styles.input}
                placeholder="I wake up this morning and everything has changed. I feel..."
                placeholderTextColor="rgba(46,37,48,0.4)"
                value={ownContent}
                onChangeText={setOwnContent}
                multiline
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>VOICE</Text>
            <View style={styles.chipRow}>
              {VOICES.map((v) => (
                <Chip key={v.id} label={v.label} active={voice === v.id} onPress={() => setVoice(v.id)} />
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button title="💾 Save Story" onPress={handleSaveOwn} loading={saving} fullWidth style={{ marginTop: 14 }} />
          </GlassCard>
        )}

        <Text style={styles.sectionLabel}>📚 Your Story Library</Text>
        <TabPill
          style={{ marginBottom: 12 }}
          value={libFilter}
          onChange={setLibFilter}
          options={[
            { value: 'ai', label: '✨ AI Stories' },
            { value: 'own', label: '✍️ My Own' },
          ]}
        />

        {loadingLib ? (
          <Text style={styles.muted}>Loading your library...</Text>
        ) : filteredLibrary.length === 0 ? (
          <Text style={styles.muted}>No stories here yet ✨</Text>
        ) : (
          filteredLibrary.map((story) => (
            <View key={story.id} style={styles.storyCard}>
              <View style={styles.storyCardHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                  <Text style={styles.storyTitle} numberOfLines={1}>{story.title}</Text>
                  {story.locked ? <Text style={styles.lockBadge}>🔒</Text> : null}
                </View>
                <View style={styles.storyIconRow}>
                  <TouchableOpacity onPress={() => handleFavorite(story.id)}><Text style={styles.libIconText}>{story.is_favorite ? '★' : '☆'}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePin(story.id)}><Text style={styles.libIconText}>{story.is_pinned ? '📌' : '📍'}</Text></TouchableOpacity>
                  {story.source === 'ai' && (
                    <TouchableOpacity onPress={() => handleRegenerate(story.id)}><Text style={styles.libIconText}>🔄</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => openEdit(story)}><Text style={styles.libIconText}>✏️</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(story.id)}><Text style={styles.libIconText}>🗑</Text></TouchableOpacity>
                </View>
              </View>
              <Text style={styles.storyPreview} numberOfLines={2}>{story.content}</Text>
              <LinkDesireButton contentType="story" contentId={story.id} contentTitle={story.title} style={{ marginBottom: 8 }} />
              <Button
                title="▶ Play"
                size="sm"
                fullWidth
                disabled={story.locked}
                loading={playingId === story.id}
                onPress={() => handlePlay(story)}
              />
            </View>
          ))
        )}
      </ScrollView>

      <UpgradeModal
        visible={showUpgrade}
        message={upgradeMsg}
        onClose={() => setShowUpgrade(false)}
        onSelectPlan={handleSelectPlan}
      />

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Edit Story</Text>

              <Text style={styles.label}>TITLE</Text>
              <View style={styles.inputBoxSm}>
                <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} placeholder="Story title" placeholderTextColor="rgba(46,37,48,0.4)" />
              </View>
              <Button title="Save Title" variant="ghost" size="sm" onPress={handleSaveEditTitle} loading={editSaving} style={{ marginTop: 8, alignSelf: 'flex-start' }} />

              {editing?.source !== 'ai' && (
                <>
                  <Text style={[styles.label, { marginTop: 16 }]}>STORY TEXT</Text>
                  <View style={[styles.inputBox, { minHeight: 140 }]}>
                    <TextInput style={styles.input} value={editContent} onChangeText={setEditContent} multiline />
                  </View>
                </>
              )}

              <Text style={[styles.label, { marginTop: 16 }]}>VOICE</Text>
              <View style={styles.chipRow}>
                {VOICES.map((v) => (
                  <Chip key={v.id} label={v.label} active={editVoice === v.id} onPress={() => setEditVoice(v.id)} />
                ))}
              </View>

              <Button title="💾 Save Story Text" onPress={handleSaveEditContent} loading={editSaving} fullWidth style={{ marginTop: 14 }} />
              <Button title="🎙️ Regenerate Audio in This Voice" variant="ghost" onPress={handleRegenerateVoice} loading={regenAudioLoading} fullWidth style={{ marginTop: 8 }} />

              <TouchableOpacity onPress={() => setEditing(null)} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  lockBadge: { fontSize: 11 },
  upsellHint: { fontFamily: fonts.displayItalic, fontSize: 12.5, color: colors.purpleDark, marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
  cardMargin: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  helperText: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginBottom: 10, lineHeight: 18 },
  inputBox: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)', minHeight: 90 },
  inputBoxSm: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginVertical: 10, textAlign: 'center' },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, textAlign: 'center', marginTop: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  sectionLabel: { fontFamily: fonts.displayMedium, fontSize: 17, fontWeight: '600', color: colors.ink, marginTop: 8, marginBottom: 10 },

  storyCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, padding: 12, marginBottom: 10 },
  storyCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  storyTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
  storyIconRow: { flexDirection: 'row', gap: 8 },
  libIconText: { fontSize: 14 },
  storyPreview: { fontFamily: fonts.displayItalic, color: colors.mist, fontSize: 13.5, lineHeight: 20, marginBottom: 10, fontStyle: 'italic' },
  usageHint: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist, marginTop: 8, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(46,37,48,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fffaf3', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '88%' },
  modalTitle: { fontFamily: fonts.displayMedium, fontSize: 19, fontWeight: '400', color: colors.ink, marginBottom: 16 },
  cancelText: { fontFamily: fonts.body, color: colors.mist, fontSize: 13.5, fontWeight: '500' },
});
