import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateStory, saveOwnStory, getStories, getItemAudio,
  favoriteStory, pinStory, deleteStory, regenerateStory,
  getStoryAudioStatus, getStoryPlaysToday, addStoryPlay, createCheckout,
  getStoryUsage, updateStoryLabel, updateStoryContent,
} from '../../services/api';
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

const RTG_PINNED_KEY = 'mv_story_rtg_pinned';

const LENGTHS = [
  { value: 'short', label: 'Short (~150 words)' },
  { value: 'medium', label: 'Medium (~300 words)' },
  { value: 'long', label: 'Long (~500 words)' },
];

const MODES = [
  { value: 'i_am', label: '💗 I Am' },
  { value: 'you_are', label: '✨ You Are' },
  { value: 'mix', label: '🎛️ Mix' },
];

const VOICES = [
  { id: 'luna', label: '🌸 Luna' },
  { id: 'orion', label: '🌙 Orion' },
  { id: 'sage', label: '🍃 Sage' },
];

// Matches the website's "Ready-Made Stories" library — instant present-tense
// stories, grouped by category, playable without generating or saving.
const RTG_STORIES = [
  { ic: '💰', category: 'Wealth', title: 'Money Flows to Me Now', content: "I open my eyes this morning and the first thing I feel is ease. Abundance is no longer something I chase — it is something I live inside of. I check my accounts and feel calm, not fear. Money moves to me from directions I didn't even expect, and I say thank you every time. I make decisions about my finances from a place of confidence, not scarcity. I spend with joy and I save with intention. Wealth is not a number to me anymore — it's a feeling, and I feel it in my whole body, every single day." },
  { ic: '💕', category: 'Love', title: 'I Am Deeply Loved', content: "I wake up slowly and I am already smiling before I understand why. Then I remember — I am loved, fully and without condition. My relationships feel safe, warm, and real. I give love freely because I finally trust that it comes back to me. When I walk into a room, I am met with warmth. When I need support, it is there. I no longer question if I am worthy of this kind of love — I simply live inside of it, grateful and at peace, every single day." },
  { ic: '🌿', category: 'Health', title: 'My Body is Vibrant and Well', content: "I wake up and my first sensation is aliveness. Not the groggy drag I used to know, but real, clean energy moving through me. My body feels light, strong, and capable. I move through my day with ease — climbing stairs, carrying things, simply existing — and none of it drains me. I nourish myself because I love myself, not out of obligation. Every system in my body works in harmony. I am healthy, I am strong, and I feel it in every cell." },
  { ic: '✨', category: 'Purpose', title: 'I Am Living My Purpose', content: "I am in the middle of my work and I lose track of time. This happens often now — hours feel like minutes because I am doing exactly what I am meant to do. My days have a rhythm that feels true to who I am. I no longer force myself through tasks that drain me; I am aligned with work that lights me up. People notice the difference in me. I show up fully, because I finally know why I'm here." },
  { ic: '🏡', category: 'Home', title: 'I Live in My Dream Home', content: "I walk through the door and I feel it every single time — that particular kind of peace that only comes from being exactly where I belong. The light falls just right through the windows. Every room feels considered, chosen, mine. I remember dreaming about a home like this, and now I simply live in it. I am grateful every time I turn the key. This space holds me the way I always hoped a home would." },
  { ic: '👑', category: 'Confidence', title: 'I Walk in My Power', content: "I walk into the room and I am present in my body in a way I couldn't always access before. My shoulders are back. My voice is steady. I don't shrink to make others comfortable anymore. I trust my opinions, my instincts, my worth. When I speak, I mean what I say. Confidence isn't a performance for me now — it's simply how I move through the world, quietly and completely." },
  { ic: '🚀', category: 'Career', title: 'My Work is My Calling', content: "I sit at my desk this morning and I feel something I once thought was only for other people: real fulfilment. My work challenges me in ways that make me grow, not shrink. I am recognised for what I bring. Opportunities keep finding their way to me because I show up as exactly who I am. I no longer separate my ambition from my joy — they are the same thing now, and I love where they're taking me." },
  { ic: '🕊️', category: 'Peace', title: 'I Live From a Place of Peace', content: "There is a stillness at the centre of me that holds regardless of what happens around me. I used to think peace meant nothing ever went wrong. Now I know peace is something I carry, not something I wait for. I breathe, and I return to it easily. Chaos can exist outside of me without becoming part of me. I am calm. I am grounded. I am, finally, at rest inside my own life." },
  { ic: '🌟', category: 'Manifestation', title: 'I Am a Powerful Creator', content: "I understand now what I am. I am not a passive recipient of circumstance — I am the one shaping it. My thoughts, my focus, my belief: these are the raw materials of my life, and I use them deliberately now. What I give my attention to grows. What I release, dissolves. I watch my life rearrange itself around what I choose to believe is possible, and I no longer find that surprising. I am a powerful creator, and I create on purpose." },
  { ic: '🌸', category: 'Self Love', title: 'I Have Come Home to Myself', content: "I am kind to myself today. I say this as a fact, not an aspiration. The voice in my head that used to criticise every move I made has softened into something gentler, something that sounds like a friend. I forgive myself easily now. I celebrate the smallest wins without waiting for permission. I have stopped abandoning myself to keep others comfortable. Coming home to myself was the whole journey, and I am finally here." },
  { ic: '🌙', category: 'Sleep', title: 'I Programme My Sleep Tonight', content: "The day is releasing me. I feel it — the gradual loosening of the grip my thoughts usually have. My body sinks into the bed, heavier and softer with every breath. My mind knows it is safe to let go now. As I drift, my subconscious quietly receives everything I've asked of it — healing, clarity, the version of my life I'm building. I sleep deeply and completely, and I trust what happens while I rest." },
  { ic: '🎯', category: 'Goals', title: 'I Have Achieved It', content: "I am standing on the other side of the thing I used to only dare to imagine. It is real now, solid, mine. I remember the version of me who wasn't sure this was possible, and I want to tell them: it was always coming. Every step, even the uncertain ones, led exactly here. I did this. I let myself want it, I worked for it, and I received it. This is what having it feels like — and it feels like coming home." },
];
const RTG_CATEGORIES = ['All', ...Array.from(new Set(RTG_STORIES.map((s) => s.category)))];

export default function Stories() {
  const insets = useSafeAreaInsets();
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
  const [editingId, setEditingId] = useState(null); // set when editing an existing "own" story
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const [library, setLibrary] = useState([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(null);
  const [playsToday, setPlaysToday] = useState(null);
  const [usage, setUsage] = useState(null);

  const [expandedId, setExpandedId] = useState(null); // 👁 preview toggle
  const [labelingId, setLabelingId] = useState(null); // 🏷 label editor
  const [labelDraft, setLabelDraft] = useState('');

  const [rtgExpanded, setRtgExpanded] = useState(false);
  const [rtgCategory, setRtgCategory] = useState('All');
  const [rtgPinned, setRtgPinned] = useState([]);
  const [rtgPlayingTitle, setRtgPlayingTitle] = useState(null);

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
    (async () => {
      try {
        const pinned = await AsyncStorage.getItem(RTG_PINNED_KEY);
        if (pinned) setRtgPinned(JSON.parse(pinned));
      } catch (_) {}
    })();
  }, []);

  const stopSound = async () => { if (sound) { try { await sound.unloadAsync(); } catch (_) {} } setSound(null); setPlayingId(null); setPreviewPlaying(false); setRtgPlayingTitle(null); };

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

  const resetOwnForm = () => { setOwnTitle(''); setOwnContent(''); setEditingId(null); setError(''); };

  const handleSaveOwn = async () => {
    if (!ownContent.trim()) { setError('Write your story first.'); return; }
    if (!editingId && ownCap != null && ownStoriesTotal >= ownCap) {
      setUpgradeMsg(`You've used all ${ownCap} of your free own stories -- upgrade for more room.`);
      setShowUpgrade(true);
      return;
    }
    setError(''); setSaving(true);
    try {
      if (editingId) {
        const updated = await updateStoryContent(editingId, ownContent.trim(), ownTitle.trim() || 'My Story', voice);
        setLibrary((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...updated } : s)));
      } else {
        const story = await saveOwnStory({ title: ownTitle.trim() || 'My Story', content: ownContent.trim(), voice_id: voice });
        setLibrary((prev) => [story, ...prev]);
      }
      resetOwnForm();
      loadUsage();
    } catch (e) {
      if (e.status === 403) { setUpgradeMsg(e.message || 'Upgrade for more own stories.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not save story');
    } finally { setSaving(false); }
  };

  // "Load & Play" — preview unsaved text through TTS without saving it yet.
  const handleLoadAndPlay = async () => {
    if (!ownContent.trim()) { setError('Write your story first.'); return; }
    await stopSound();
    setPreviewPlaying(true); setError('');
    try {
      const uri = await getItemAudio('story', 0, ownContent.trim(), voice);
      const { sound: newSound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setPreviewPlaying(false); });
    } catch (e) {
      setError(e.message || 'Could not play preview');
      setPreviewPlaying(false);
    }
  };

  const handleEditOwn = (story) => {
    setOwnTitle(story.title || '');
    setOwnContent(story.content || '');
    setEditingId(story.id);
    setTab('write');
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

  const handlePlayRTG = async (preset) => {
    await stopSound();
    setRtgPlayingTitle(preset.title); setError('');
    try {
      const uri = await getItemAudio('story', 0, preset.content, voice);
      const { sound: newSound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setRtgPlayingTitle(null); });
    } catch (e) {
      setError(e.message || 'Could not play story');
      setRtgPlayingTitle(null);
    }
  };

  const toggleRtgPin = async (title) => {
    const next = rtgPinned.includes(title) ? rtgPinned.filter((t) => t !== title) : [...rtgPinned, title];
    setRtgPinned(next);
    try { await AsyncStorage.setItem(RTG_PINNED_KEY, JSON.stringify(next)); } catch (_) {}
  };

  const handleFavorite = async (id) => { try { await favoriteStory(id); loadLibrary(); } catch (_) {} };
  const handlePin = async (id) => { try { await pinStory(id); loadLibrary(); } catch (_) {} };
  const handleDelete = async (id) => { try { await deleteStory(id); setLibrary((l) => l.filter((s) => s.id !== id)); } catch (_) {} };
  const handleRegenerate = async (id) => { try { await regenerateStory(id); loadLibrary(); } catch (e) { setError(e.message || 'Regenerate failed'); } };

  const openLabelEditor = (story) => { setLabelingId(story.id); setLabelDraft(story.label || ''); };
  const handleSaveLabel = async (id) => {
    try { await updateStoryLabel(id, labelDraft.trim()); setLibrary((l) => l.map((s) => (s.id === id ? { ...s, label: labelDraft.trim() } : s))); } catch (_) {}
    setLabelingId(null);
  };

  const filteredLibrary = library.filter((s) => (libFilter === 'ai' ? s.source === 'ai' : s.source !== 'ai'));
  const filteredRTG = RTG_STORIES.filter((s) => rtgCategory === 'All' || s.category === rtgCategory);

  const usageLine = usage
    ? `${usage.used_today ?? usage.today ?? 0}/${usage.limit_today ?? usage.daily_limit ?? '—'} today · ${usage.used_month ?? usage.month ?? 0}/${usage.limit_month ?? usage.monthly_limit ?? '—'} this month`
    : null;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 14, paddingBottom: 40 }}>
        <ScreenHeader lead="Manifest" accent="Stories" subtitle="Generate, write or play stories as if your desire has already arrived. ✨" />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'manifest', label: '📖 Manifest Stories' },
            { value: 'write', label: '✍️ Write Your Own' },
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
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button title="Generate My Story ✨" onPress={handleGenerate} loading={generating} fullWidth style={{ marginTop: 14 }} />
            {usageLine ? <Text style={styles.usageText}>{usageLine}</Text> : null}
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
            <View style={styles.ownBtnRow}>
              <Button title="▶ Load & Play" size="sm" onPress={handleLoadAndPlay} loading={previewPlaying} style={{ flex: 1 }} />
              <Button title="💾 Save" size="sm" variant="ghost" onPress={handleSaveOwn} loading={saving} style={{ flex: 1 }} />
              <Button title={editingId ? '✕ Cancel' : 'Clear'} size="sm" variant="ghost" onPress={resetOwnForm} style={{ flex: 1 }} />
            </View>
            {usageLine ? <Text style={styles.usageText}>{usageLine}</Text> : null}
          </GlassCard>
        )}

        <TouchableOpacity style={styles.rtgHeaderRow} onPress={() => setRtgExpanded((v) => !v)}>
          <Text style={styles.rtgHeading}>✨ Ready-Made Stories</Text>
          <Text style={styles.rtgChevron}>{rtgExpanded ? 'Hide ▲' : 'Show ▼'}</Text>
        </TouchableOpacity>

        {rtgExpanded && (
          <>
            <View style={[styles.chipRow, { marginBottom: 12 }]}>
              {RTG_CATEGORIES.map((c) => (
                <Chip key={c} label={c} active={rtgCategory === c} onPress={() => setRtgCategory(c)} />
              ))}
            </View>
            <View style={styles.rtgGrid}>
              {filteredRTG.map((s) => (
                <View key={s.title} style={styles.rtgCard}>
                  <TouchableOpacity style={styles.rtgPin} onPress={() => toggleRtgPin(s.title)}>
                    <Text style={{ fontSize: 13 }}>{rtgPinned.includes(s.title) ? '📌' : '📍'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.rtgCardIcon}>{s.ic}</Text>
                  <Text style={styles.rtgCardCategory}>{s.category.toUpperCase()}</Text>
                  <Text style={styles.rtgCardTitle}>{s.title}</Text>
                  <Text style={styles.rtgCardPreview} numberOfLines={2}>{s.content}</Text>
                  <Button
                    title="▶ Play"
                    size="xs"
                    fullWidth
                    loading={rtgPlayingTitle === s.title}
                    onPress={() => handlePlayRTG(s)}
                  />
                </View>
              ))}
            </View>
          </>
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
                <TouchableOpacity onPress={() => handleDelete(story.id)}><Text style={styles.libIconText}>🗑</Text></TouchableOpacity>
              </View>
              <Text style={styles.storyPreview} numberOfLines={expandedId === story.id ? undefined : 2}>{story.content}</Text>

              {labelingId === story.id && (
                <View style={styles.labelRow}>
                  <View style={[styles.inputBoxSm, { flex: 1, paddingVertical: 4 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Label this story..."
                      placeholderTextColor="rgba(46,37,48,0.4)"
                      value={labelDraft}
                      onChangeText={setLabelDraft}
                    />
                  </View>
                  <Button title="Save" size="xs" onPress={() => handleSaveLabel(story.id)} />
                </View>
              )}

              <Button
                title="▶ Play"
                size="sm"
                fullWidth
                disabled={story.locked}
                loading={playingId === story.id}
                onPress={() => handlePlay(story)}
                style={{ marginBottom: 8 }}
              />
              <View style={styles.storyIconRow}>
                <TouchableOpacity onPress={() => setExpandedId(expandedId === story.id ? null : story.id)}><Text style={styles.libIconText}>👁</Text></TouchableOpacity>
                {story.source === 'ai' ? (
                  <>
                    <TouchableOpacity onPress={() => openLabelEditor(story)}><Text style={styles.libIconText}>🏷</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRegenerate(story.id)}><Text style={styles.libIconTextWithLabel}>🔄 New style</Text></TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity onPress={() => handleEditOwn(story)}><Text style={styles.libIconText}>✏️</Text></TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleFavorite(story.id)}><Text style={styles.libIconText}>{story.is_favorite ? '★' : '☆'}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handlePin(story.id)}><Text style={styles.libIconText}>{story.is_pinned ? '📌' : '📍'}</Text></TouchableOpacity>
              </View>
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
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  lockBadge: { fontSize: 11 },
  upsellHint: { fontFamily: fonts.displayItalic, fontSize: 12.5, color: colors.purpleDark, marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
  usageText: { fontFamily: fonts.body, fontSize: 11, color: colors.mist2, marginTop: 10, textAlign: 'center' },
  cardMargin: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  helperText: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginBottom: 10, lineHeight: 18 },
  inputBox: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)', minHeight: 90 },
  inputBoxSm: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginVertical: 10, textAlign: 'center' },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, textAlign: 'center', marginTop: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ownBtnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },

  /* Ready-Made Stories */
  rtgHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 14 },
  rtgHeading: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.purpleDark, fontWeight: '600' },
  rtgChevron: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.mist },
  rtgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  rtgCard: { width: '48.5%', backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, padding: 12 },
  rtgPin: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
  rtgCardIcon: { fontSize: 18, marginBottom: 4 },
  rtgCardCategory: { fontFamily: fonts.bodyMedium, fontSize: 9.5, color: colors.purpleAccent, fontWeight: '700', letterSpacing: 0.6, marginBottom: 2 },
  rtgCardTitle: { fontFamily: fonts.bodyMedium, fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  rtgCardPreview: { fontFamily: fonts.displayItalic, fontSize: 11.5, color: colors.mist, fontStyle: 'italic', lineHeight: 16, marginBottom: 10 },

  sectionLabel: { fontFamily: fonts.displayMedium, fontSize: 17, fontWeight: '600', color: colors.ink, marginTop: 8, marginBottom: 10 },

  storyCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, padding: 12, marginBottom: 10 },
  storyCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  storyTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
  storyIconRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  libIconText: { fontSize: 14 },
  libIconTextWithLabel: { fontSize: 12, fontFamily: fonts.bodyMedium, color: colors.purpleDark, fontWeight: '600' },
  storyPreview: { fontFamily: fonts.displayItalic, color: colors.mist, fontSize: 13.5, lineHeight: 20, marginBottom: 10, fontStyle: 'italic' },
  labelRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
});
