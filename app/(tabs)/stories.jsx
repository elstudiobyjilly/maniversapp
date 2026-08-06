import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateStory, saveOwnStory, getStories, getItemAudio,
  favoriteStory, pinStory, deleteStory, regenerateStory,
  getStoryAudioStatus, getStoryPlaysToday, addStoryPlay, createCheckout,
  updateStoryLabel, updateStoryContent, startSession, completeSession,
} from '../../services/api';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import TabPill from '../../components/TabPill';
import Chip from '../../components/Chip';
import Button from '../../components/Button';
import ExpandableTextArea from '../../components/ExpandableTextArea';
import UsageBadge from '../../components/UsageBadge';
import NowPlayingPlayer from '../../components/NowPlayingPlayer';
import ReadModeModal from '../../components/ReadModeModal';
import { usePlanStore } from '../../store/planStore';
import { useAuthStore } from '../../store/authStore';
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

// "System" is the device's own TTS — available on every plan since nothing
// is rendered server-side for it (matches the website's voice pills).
const VOICES = [
  { id: 'luna', label: '🌸 Luna' },
  { id: 'orion', label: '🌙 Orion' },
  { id: 'sage', label: '🍃 Sage' },
  { id: 'system', label: '🤖 System' },
];
const voiceName = (id) => (VOICES.find((v) => v.id === id)?.label || '').replace(/^\S+\s/, '') || 'Luna';

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
  // Usage counters come from /auth/me (ai_usage + ai_usage_today), matching
  // the website's _fetchAndUpdateUsage().
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const aiUsage = user?.ai_usage || {};
  const aiUsageToday = user?.ai_usage_today || {};
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
  // Open /sessions row for the story currently narrating, completed when the
  // audio finishes. Without this, listening to a story never reached the
  // Tracker's totals/streak — only affirmation plays did.
  const activeSessionId = useRef(null);
  const [playsToday, setPlaysToday] = useState(null);

  const [expandedId, setExpandedId] = useState(null); // 👁 preview toggle
  const [labelingId, setLabelingId] = useState(null); // 🏷 label editor
  const [labelDraft, setLabelDraft] = useState('');

  const [rtgExpanded, setRtgExpanded] = useState(false);
  const [rtgCategory, setRtgCategory] = useState('All');
  const [rtgPinned, setRtgPinned] = useState([]);
  const [rtgPlayingTitle, setRtgPlayingTitle] = useState(null);

  // Full-screen "Now Playing" player -- { queue, startIndex } or null.
  const [player, setPlayer] = useState(null);
  // Read Mode -- { title, content } or null, opened from the player's
  // "Read the full story" button.
  const [readItem, setReadItem] = useState(null);

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

  useEffect(() => {
    refresh();
    loadLibrary();
    loadPlaysToday();
    (async () => {
      try {
        const pinned = await AsyncStorage.getItem(RTG_PINNED_KEY);
        if (pinned) setRtgPinned(JSON.parse(pinned));
      } catch (_) {}
    })();
  }, []);

  // Stopping early leaves the session row open-but-incomplete, exactly like
  // the affirmation player: total_sessions still counts it, completed_sessions
  // doesn't.
  const stopSound = async () => {
    if (sound) { try { await sound.unloadAsync(); } catch (_) {} }
    activeSessionId.current = null;
    setSound(null); setPlayingId(null); setPreviewPlaying(false); setRtgPlayingTitle(null);
  };

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
        refreshUser(); // usage badge reflects the quota we just consumed
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
        refreshUser();
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

  // ── Full-screen "Now Playing" player ────────────────────────────────
  // Queue items are a common shape ({ id, title, content, kind, raw }) so
  // one player instance can play either the saved library or the
  // Ready-Made set, with the rest of that same list as its queue/up-next.
  const toLibraryQueueItem = (story) => ({ id: story.id, title: story.title, content: story.content, kind: 'library', raw: story });
  const toRtgQueueItem = (preset) => ({ id: preset.title, title: preset.title, content: preset.content, kind: 'rtg', raw: preset });

  const resolveAudioUri = async (item) => {
    if (item.kind === 'library') {
      let uri = item.raw.audio_url;
      if (!uri) {
        try { uri = (await getStoryAudioStatus(item.raw.id))?.audio_url; } catch (_) {}
      }
      if (!uri) uri = await getItemAudio('story', item.raw.id, item.raw.content, voice);
      return uri;
    }
    return getItemAudio('story', 0, item.raw.content, voice);
  };

  const handleTrackStart = (item) => {
    if (item.kind === 'library') {
      setPlayingId(item.raw.id);
      // Best-effort Tracker session + daily play count, same as before —
      // a failure here must never stop playback.
      startSession({ affirmationId: null, repeatTarget: 1 })
        .then((sess) => { activeSessionId.current = sess?.id ?? null; })
        .catch(() => { activeSessionId.current = null; });
      addStoryPlay().then(loadPlaysToday).catch(() => {});
    } else {
      setRtgPlayingTitle(item.title);
    }
  };

  const handleTrackFinish = (item) => {
    if (item.kind === 'library') {
      setPlayingId(null);
      const id = activeSessionId.current;
      if (id) { activeSessionId.current = null; completeSession(id, 1).catch(() => {}); }
    } else {
      setRtgPlayingTitle(null);
    }
  };

  const closePlayer = () => {
    setPlayer(null);
    setPlayingId(null);
    setRtgPlayingTitle(null);
    activeSessionId.current = null;
  };

  const handlePlay = (story, list) => {
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
    const queue = (list || filteredLibrary).map(toLibraryQueueItem);
    const startIndex = Math.max(0, queue.findIndex((q) => q.raw.id === story.id));
    setError('');
    setPlayer({ queue, startIndex });
  };

  const handlePlayRTG = (preset, list) => {
    const queue = (list || filteredRTG).map(toRtgQueueItem);
    const startIndex = Math.max(0, queue.findIndex((q) => q.raw.title === preset.title));
    setError('');
    setPlayer({ queue, startIndex });
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

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 14, paddingBottom: 120 }}>
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
            <Text style={styles.helperText}>Describe your desire and {voiceName(voice)} writes a vivid present-tense story as if it has already arrived.</Text>
            <ExpandableTextArea
              value={desire}
              onChangeText={setDesire}
              placeholder="e.g. I have found my soulmate and we share a deep, joyful, passionate love..."
              modalTitle="Your Desire"
              minHeight={110}
            />

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
            <View style={styles.actionRow}>
              <Button title="Generate My Story ✨" onPress={handleGenerate} loading={generating} style={{ flex: 1 }} />
              <UsageBadge
                usedToday={aiUsageToday.ai_stories}
                dailyLimit={limits?.ai_stories_day}
                usedMonth={aiUsage.stories}
                monthLimit={limits?.stories}
                featureLabel="AI stories"
              />
            </View>
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
            <ExpandableTextArea
              value={ownContent}
              onChangeText={setOwnContent}
              placeholder="I wake up this morning and everything has changed. I feel..."
              modalTitle="Your Story"
              minHeight={140}
              style={{ marginTop: 8 }}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>VOICE</Text>
            <View style={styles.chipRow}>
              {VOICES.map((v) => (
                <Chip key={v.id} label={v.label} active={voice === v.id} onPress={() => setVoice(v.id)} />
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.ownBtnRow}>
              <Button title="▶ Load & Play" size="sm" onPress={handleLoadAndPlay} loading={previewPlaying} />
              <Button title="💾 Save" size="sm" variant="ghost" onPress={handleSaveOwn} loading={saving} />
              <Button title="Clear" size="sm" variant="ghost" onPress={() => { setOwnContent(''); setOwnTitle(''); setError(''); }} />
              {editingId ? <Button title="✕ Cancel" size="sm" variant="ghost" onPress={resetOwnForm} /> : null}
            </View>
            <UsageBadge
              style={{ marginTop: 10 }}
              usedToday={aiUsageToday.own_stories}
              dailyLimit={limits?.own_stories_day}
              usedMonth={aiUsage.own_stories}
              monthLimit={limits?.own_stories_month ?? limits?.own_stories_total}
              featureLabel="own stories"
            />
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
              {story.created_at ? (
                <Text style={styles.storyDate}>
                  {new Date(story.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              ) : null}
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

              {/* One row: Play · 👁 · 🏷 · 🔄 New style — matching the website's
                  card action bar rather than a full-width button + icons below. */}
              <View style={styles.storyActionRow}>
                <Button
                  title="▶ Play"
                  size="sm"
                  disabled={story.locked}
                  loading={playingId === story.id}
                  onPress={() => handlePlay(story)}
                />
                <TouchableOpacity style={styles.storyIconBtn} onPress={() => setExpandedId(expandedId === story.id ? null : story.id)}>
                  <Text style={styles.libIconText}>👁</Text>
                </TouchableOpacity>
                {story.source === 'ai' ? (
                  <>
                    <TouchableOpacity style={styles.storyIconBtn} onPress={() => openLabelEditor(story)}>
                      <Text style={styles.libIconText}>🏷</Text>
                    </TouchableOpacity>
                    <Button title="🔄 New style" size="sm" variant="ghost" onPress={() => handleRegenerate(story.id)} />
                  </>
                ) : (
                  <TouchableOpacity style={styles.storyIconBtn} onPress={() => handleEditOwn(story)}>
                    <Text style={styles.libIconText}>✏️</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.storyIconBtn} onPress={() => handleFavorite(story.id)}>
                  <Text style={styles.libIconText}>{story.is_favorite ? '★' : '☆'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.storyIconBtn} onPress={() => handlePin(story.id)}>
                  <Text style={styles.libIconText}>{story.is_pinned ? '📌' : '📍'}</Text>
                </TouchableOpacity>
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

      {player && (
        <NowPlayingPlayer
          visible={!!player}
          queue={player.queue}
          startIndex={player.startIndex}
          kicker="Now Playing — Stories"
          getAudioUri={resolveAudioUri}
          onTrackStart={handleTrackStart}
          onTrackFinish={handleTrackFinish}
          onClose={closePlayer}
          isFavorited={(item) => (item.kind === 'library' ? !!item.raw.is_favorite : rtgPinned.includes(item.title))}
          onToggleFavorite={(item) => (item.kind === 'library' ? handleFavorite(item.raw.id) : toggleRtgPin(item.title))}
          onReadFull={(item) => setReadItem({ title: item.title, content: item.content })}
        />
      )}

      <ReadModeModal
        visible={!!readItem}
        onClose={() => setReadItem(null)}
        title={readItem?.title}
        content={readItem?.content}
        kicker="Story"
        // The player Modal stays mounted (and audio keeps playing)
        // underneath Read Mode -- "Listen" just returns to it.
        onListen={() => setReadItem(null)}
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
  inputBox: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)', minHeight: 90 },
  inputBoxSm: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginVertical: 10, textAlign: 'center' },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, textAlign: 'center', marginTop: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ownBtnRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' },

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
  storyDate: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist2, marginBottom: 6 },
  storyActionRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  storyIconBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  libIconText: { fontSize: 14 },
  storyPreview: { fontFamily: fonts.displayItalic, color: colors.mist, fontSize: 13.5, lineHeight: 20, marginBottom: 10, fontStyle: 'italic' },
  labelRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
});
