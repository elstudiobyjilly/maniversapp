import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateAffirmation, getAffirmations, getAffirmationAudio,
  favoriteAffirmation, pinAffirmation, deleteAffirmation, getPinnedSets,
  saveOwnAffirmationSet, getAffirmationAudioStatus, createCheckout,
  getDailyIntention, saveDailyIntention, startSession, completeSession,
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
import { usePlanStore } from '../../store/planStore';
import { useAuthStore } from '../../store/authStore';
import { colors, fonts, radii } from '../../constants/theme';
import * as Linking from 'expo-linking';

const RECENT_KEY = 'mv_aff_recent_played';

const STYLES = [
  { value: 'i_am', label: '💗 I Am' },
  { value: 'you_are', label: '✨ You Are' },
  { value: 'mix', label: '🎛️ Mix' },
];

// "System" is the device's own TTS — always available on every plan, since
// nothing is rendered server-side for it (matches the website's voice pills).
const VOICES = [
  { id: 'luna', label: '🌸 Luna' },
  { id: 'orion', label: '🌙 Orion' },
  { id: 'sage', label: '🍃 Sage' },
  { id: 'system', label: '🤖 System' },
];

// Matches the website's "Ready To Go Affirmations" pack — 12 instant sets,
// 5 affirmations each. First two (Ho'oponopono, Sleep Programming) always
// show as quick rows; the full grid appears when expanded.
const RTG_PRESETS = [
  { ic: '💰', name: 'Abundance & Money', affs: ['I am a magnet for money and it flows to me easily', 'Wealth and abundance are my natural state', 'I make empowered decisions about my finances', 'Opportunities to earn and grow money find me constantly', 'I am worthy of financial freedom and I receive it now'] },
  { ic: '💕', name: 'Love & Relationships', affs: ['I am deeply worthy of love, exactly as I am', 'Love flows to me freely and abundantly', 'I attract relationships that are kind, safe and true', 'I give and receive love with an open heart', 'I am surrounded by people who cherish me'] },
  { ic: '🌿', name: 'Health & Healing', affs: ['My body is healing and growing stronger every day', 'I nourish myself with love, rest and movement', 'Every cell in my body vibrates with health', 'I trust my body and I am grateful for it', 'Vitality and energy flow through me freely'] },
  { ic: '✨', name: 'Confidence & Self Love', affs: ['I am enough exactly as I am', 'I trust myself and my decisions', 'I love and accept myself fully', 'I walk into every room knowing my worth', 'My confidence grows stronger every single day'] },
  { ic: '🏡', name: 'Dream Home', affs: ['My dream home is already on its way to me', 'I am worthy of a beautiful, peaceful home', 'Everything about my home fills me with joy', 'I feel safe, warm and abundant in my space', 'The perfect home finds me at the perfect time'] },
  { ic: '🎯', name: 'Career & Success', affs: ['I am building the career of my dreams', 'Opportunities are constantly finding me', 'My work has real value and people recognise it', 'I am talented, capable and unstoppable', 'Success comes to me easily and often'] },
  { ic: '😴', name: 'Sleep & Rest', affs: ['I release the day and welcome deep, peaceful rest', 'My body knows how to relax and restore itself', 'I sleep deeply and wake up refreshed', 'Every breath brings me closer to calm', 'Rest is safe, easy and natural for me'] },
  { ic: '🌅', name: 'Morning Energy', affs: ['I wake up with energy, clarity and purpose', 'Today is full of possibility', 'I greet this day with gratitude and excitement', 'My mind is clear and my body feels alive', 'I am ready for everything good coming my way'] },
  { ic: '🧘', name: 'Inner Peace & Calm', affs: ['I am calm, grounded and at peace', 'I release what I cannot control', 'Peace lives inside me no matter what surrounds me', 'I breathe in calm and breathe out tension', 'My mind is quiet and my heart is settled'] },
  { ic: '⭐', name: 'Manifestation Power', affs: ['I am a powerful creator of my reality', 'My thoughts and feelings shape my life with ease', 'Everything I desire is already on its way', 'I trust the timing of my life completely', 'I manifest with clarity, ease and joy'] },
  { ic: '⭕', name: "Ho'oponopono", affs: ["I'm sorry. Please forgive me. Thank you. I love you.", 'I release all that no longer serves my highest good', 'I forgive myself completely and unconditionally', 'I am healed, whole and at peace with my past', 'Love flows through me, clearing all resistance now'] },
  { ic: '🌙', name: 'Sleep Programming', affs: ['As I sleep, my subconscious receives my desires', 'My body and mind regenerate beautifully overnight', 'I wake up having already manifested in my sleep', 'Abundance flows to me even as I rest and dream', 'My subconscious is now programmed for success and joy'] },
];

const RTG_QUICK = RTG_PRESETS.slice(-2); // Ho'oponopono, Sleep Programming — always visible

export default function Affirmations() {
  const insets = useSafeAreaInsets();
  const { limits, loaded, hasFeature, allowedVoices, refresh } = usePlanStore();
  // Usage counters come from /auth/me (ai_usage + ai_usage_today), exactly
  // like the website's _fetchAndUpdateUsage().
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const aiUsage = user?.ai_usage || {};
  const aiUsageToday = user?.ai_usage_today || {};
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  // Top-level: 'hub' (Pinned/Library) vs 'create' (AI/Write Your Own)
  const [topTab, setTopTab] = useState('create');
  const [hubTab, setHubTab] = useState('pinned');
  const [createMode, setCreateMode] = useState('ai'); // 'ai' | 'own'

  const [libFilter, setLibFilter] = useState('all'); // 'ai' | 'own' | 'all'
  const [sortMode, setSortMode] = useState('newest'); // 'newest' | 'oldest' | 'recent'
  const [multiLoad, setMultiLoad] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [recentPlayed, setRecentPlayed] = useState({});

  const [rtgExpanded, setRtgExpanded] = useState(false);

  const [intention, setIntention] = useState('');
  const [intentionSaved, setIntentionSaved] = useState(false);

  const [desire, setDesire] = useState('');
  const [setName, setSetName] = useState(''); // "Name this set (optional)"
  const [style, setStyle] = useState('');
  const [count, setCount] = useState(5);
  const [repeatCount, setRepeatCount] = useState(10);
  const [voice, setVoice] = useState('luna');
  const [generating, setGenerating] = useState(false);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);
  // Open /sessions row for the run currently playing, completed when the
  // audio finishes naturally (matching the website's activeSessId).
  const activeSessionId = useRef(null);

  // Write-your-own state. The website uses ONE textarea, one affirmation per
  // line (not a growing list of single-line inputs), so the text is kept raw
  // and split on save.
  const [ownTitle, setOwnTitle] = useState('');
  const [ownText, setOwnText] = useState('');
  const [savingOwn, setSavingOwn] = useState(false);

  const [library, setLibrary] = useState([]);
  const [loadingLib, setLoadingLib] = useState(false);
  const [pinnedIds, setPinnedIds] = useState([]);

  const canGenerateAi = hasFeature('ai_affirmations'); // false (0) on free
  const ownCap = limits?.own_affirmations_total; // free: 20 total ever
  const ownUsedCount = library
    .filter((a) => a.source === 'own')
    .reduce((sum, a) => sum + (a.affirmations?.length || 1), 0);
  const voicesAllowed = allowedVoices(); // ['luna'] on free

  const handleSelectPlan = async (priceKey) => {
    try {
      const res = await createCheckout(priceKey);
      if (res?.url) await Linking.openURL(res.url);
    } catch (e) {
      setError(e.message || 'Could not start checkout');
    }
  };

  const loadLibrary = async () => {
    setLoadingLib(true);
    try {
      const [list, pinned] = await Promise.all([getAffirmations(), getPinnedSets().catch(() => ({ sets: [] }))]);
      setLibrary(list || []);
      setPinnedIds((pinned?.sets || []).map((s) => s.id ?? s));
    } catch (_) {} finally { setLoadingLib(false); }
  };

  useEffect(() => {
    refresh();
    loadLibrary();
    (async () => {
      try {
        const data = await getDailyIntention();
        if (data) setIntention(data.intention || '');
      } catch (_) {}
      try {
        const recent = await AsyncStorage.getItem(RECENT_KEY);
        if (recent) setRecentPlayed(JSON.parse(recent));
      } catch (_) {}
    })();
  }, []);

  useEffect(() => { if (topTab === 'hub') loadLibrary(); }, [topTab]);

  // Stopping early leaves the session row open-but-incomplete, exactly like
  // the website — total_sessions still counts it, completed_sessions doesn't.
  const stopSound = async () => {
    if (sound) { try { await sound.unloadAsync(); } catch (_) {} }
    activeSessionId.current = null;
    setSound(null); setPlaying(false);
  };

  const markRecentlyPlayed = useCallback(async (id) => {
    if (!id) return;
    const next = { ...recentPlayed, [id]: Date.now() };
    setRecentPlayed(next);
    try { await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch (_) {}
  }, [recentPlayed]);

  const handleSaveIntention = async (text) => {
    if (!text.trim()) return;
    try {
      await saveDailyIntention(text.trim());
      setIntentionSaved(true);
      setTimeout(() => setIntentionSaved(false), 1800);
    } catch (_) {}
  };

  const handleGenerate = async () => {
    if (!canGenerateAi) {
      setUpgradeMsg('AI-generated affirmations are a Basic Manifestor feature. Try Write Your Own for free, or upgrade for AI generation + all voices.');
      setShowUpgrade(true);
      return;
    }
    if (!desire.trim()) { setError('Describe what you want to manifest.'); return; }
    setError(''); setGenerating(true);
    try {
      const result = await generateAffirmation(desire.trim(), {
        count, repeat_count: repeatCount, style, voice_id: voice, label: setName.trim(),
      });
      setCurrent(result);
      pollAudioStatus(result.id);
      refreshUser(); // usage badge reflects the quota we just consumed
    } catch (e) {
      if (e.status === 403) { setUpgradeMsg(e.message || 'Upgrade to generate AI affirmations.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not generate affirmations');
    } finally { setGenerating(false); }
  };

  const handleSaveOwn = async () => {
    const cleanLines = ownText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (cleanLines.length === 0) { setError('Write at least one affirmation.'); return; }
    if (ownCap != null && ownUsedCount + cleanLines.length > ownCap) {
      setUpgradeMsg(`You've used ${ownUsedCount} of your ${ownCap} free own affirmations -- upgrade for more room.`);
      setShowUpgrade(true);
      return;
    }
    setError(''); setSavingOwn(true);
    try {
      const result = await saveOwnAffirmationSet({
        title: ownTitle.trim() || 'My Affirmations',
        affs: cleanLines,
        repeat_count: repeatCount,
        voice_id: voice,
      });
      setCurrent(result);
      pollAudioStatus(result.id);
      setOwnTitle(''); setOwnText('');
      refreshUser();
      loadLibrary(); // new set should appear in the Library immediately
    } catch (e) {
      if (e.status === 403 || e.status === 429) { setUpgradeMsg(e.message || 'Upgrade for more own affirmations.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not save affirmations');
    } finally { setSavingOwn(false); }
  };

  const pollAudioStatus = (affId, attempts = 0) => {
    if (attempts > 15) return;
    setTimeout(async () => {
      try {
        const status = await getAffirmationAudioStatus(affId);
        if (status.audio_url) {
          setCurrent((prev) => (prev && prev.id === affId ? { ...prev, audio_url: status.audio_url, sub_urls: status.sub_urls } : prev));
        } else if (status.progress) {
          pollAudioStatus(affId, attempts + 1);
        }
      } catch (_) {}
    }, 2000);
  };

  const playLines = async (lines, itemId, cachedAudioUrl) => {
    await stopSound();
    setPlaying(true); setError('');
    try {
      let uri = cachedAudioUrl;
      if (!uri && itemId) {
        try {
          const status = await getAffirmationAudioStatus(itemId);
          uri = status?.audio_url;
        } catch (_) {}
      }
      if (!uri) {
        uri = await getAffirmationAudio(itemId || 0, lines.join('\n'), voice);
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      setSound(newSound);

      // Open a tracked listening session — this is what feeds the Tracker's
      // totals, streak and days-practiced. Best-effort: a failure here must
      // never stop playback.
      try {
        const sess = await startSession({ affirmationId: itemId || null, repeatTarget: repeatCount });
        activeSessionId.current = sess?.id ?? null;
      } catch (_) { activeSessionId.current = null; }

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlaying(false);
          const id = activeSessionId.current;
          if (id) {
            activeSessionId.current = null;
            completeSession(id, repeatCount).catch(() => {});
          }
        }
      });
      if (itemId) markRecentlyPlayed(itemId);
    } catch (e) {
      setError(e.message || 'Could not play audio');
      setPlaying(false);
    }
  };

  // RTG cards load into Write Your Own so the user can edit before saving —
  // matches the website's "Tap to load & edit" copy.
  const loadRTG = (preset) => {
    setOwnTitle(preset.name);
    setOwnText(preset.affs.join('\n'));
    setCreateMode('own');
    setTopTab('create');
  };

  const handleFavorite = async (id) => { try { await favoriteAffirmation(id); loadLibrary(); } catch (_) {} };
  const handlePin = async (id) => { try { await pinAffirmation(id); loadLibrary(); } catch (_) {} };
  const handleDelete = async (id) => { try { await deleteAffirmation(id); setLibrary((l) => l.filter((a) => a.id !== id)); } catch (_) {} };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleCardLoad = (item) => {
    if (item.locked) { setUpgradeMsg('This set is locked — upgrade to use it again.'); setShowUpgrade(true); return; }
    if (multiLoad) { toggleSelected(item.id); return; }
    setCurrent(item);
    setCreateMode(item.source === 'own' ? 'own' : 'ai');
    setTopTab('create');
  };

  const handlePlaySelected = () => {
    const items = library.filter((i) => selectedIds.includes(i.id));
    if (items.length === 0) return;
    const lines = items.flatMap((i) => i.affirmations || []);
    playLines(lines, null, null);
  };

  const visibleLibrary = library
    .filter((item) => hubTab === 'pinned' ? pinnedIds.includes(item.id) : true)
    .filter((item) => libFilter === 'all' ? true : (item.source || 'ai') === libFilter)
    .slice()
    .sort((a, b) => {
      if (sortMode === 'recent') return (recentPlayed[b.id] || 0) - (recentPlayed[a.id] || 0);
      if (sortMode === 'oldest') return (a.id || 0) - (b.id || 0);
      return (b.id || 0) - (a.id || 0); // newest
    });

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 14, paddingBottom: 120 }}>
        <ScreenHeader lead="Your" accent="Affirmations" subtitle="Craft powerful affirmations from your desire, or speak your own." />

        <TabPill
          style={{ marginBottom: 14 }}
          value={topTab}
          onChange={setTopTab}
          options={[
            { value: 'hub', label: '🌸 Affirm Hub' },
            { value: 'create', label: '✨ Create' },
          ]}
        />

        {topTab === 'hub' ? (
          <>
            <TabPill
              style={{ marginBottom: 14 }}
              value={hubTab}
              onChange={setHubTab}
              options={[
                { value: 'pinned', label: '📌 Pinned Sets' },
                { value: 'library', label: '📚 Library' },
              ]}
            />

            <View style={styles.chipRow}>
              <Chip label="✨ AI" active={libFilter === 'ai'} onPress={() => setLibFilter('ai')} />
              <Chip label="✍️ Own" active={libFilter === 'own'} onPress={() => setLibFilter('own')} />
              <Chip label="🌍 All" active={libFilter === 'all'} onPress={() => setLibFilter('all')} />
            </View>
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              <Chip label="🆕 Newest" active={sortMode === 'newest'} onPress={() => setSortMode('newest')} />
              <Chip label="🕰 Oldest" active={sortMode === 'oldest'} onPress={() => setSortMode('oldest')} />
              <Chip label="▶ Recently Played" active={sortMode === 'recent'} onPress={() => setSortMode('recent')} />
            </View>

            <TouchableOpacity
              style={styles.multiLoadRow}
              onPress={() => { setMultiLoad((v) => !v); setSelectedIds([]); }}
            >
              <View style={[styles.checkbox, multiLoad && styles.checkboxOn]}>
                {multiLoad ? <Text style={styles.checkboxTick}>✓</Text> : null}
              </View>
              <Text style={styles.multiLoadText}>Multiple Load</Text>
            </TouchableOpacity>

            {loadingLib ? (
              <Text style={styles.muted}>Loading your library...</Text>
            ) : visibleLibrary.length === 0 ? (
              <Text style={styles.muted}>
                {hubTab === 'pinned' ? 'No pinned sets yet — pin one from your Library ✨' : 'No affirmation sets yet — generate your first one ✨'}
              </Text>
            ) : (
              <View style={styles.libGrid}>
                {visibleLibrary.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <View key={item.id} style={[styles.libCard, selected && styles.libCardSelected]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.libTitle} numberOfLines={1}>{item.desire || 'Affirmations'}</Text>
                        {item.locked ? <Text style={{ fontSize: 10 }}>🔒</Text> : null}
                      </View>
                      <Text style={styles.libMeta}>{item.affirmations?.length || 0} affs · {item.repeat_count}× · {item.source === 'own' ? 'Own' : 'AI'}</Text>
                      <View style={styles.libBtnRow}>
                        <Button
                          title={multiLoad ? (selected ? '✓ Selected' : '+ Select') : '▶ Load'}
                          size="xs"
                          style={{ flex: 1 }}
                          disabled={item.locked}
                          onPress={() => handleCardLoad(item)}
                        />
                        <TouchableOpacity style={styles.libIconBtn} onPress={() => handleFavorite(item.id)}>
                          <Text style={styles.libIconText}>{item.is_favorite ? '★' : '☆'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.libIconBtn} onPress={() => handlePin(item.id)}>
                          <Text style={styles.libIconText}>{pinnedIds.includes(item.id) ? '📌' : '📍'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.libIconBtn} onPress={() => handleDelete(item.id)}>
                          <Text style={styles.libIconText}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {multiLoad && selectedIds.length > 0 && (
              <Button
                title={`▶ Play ${selectedIds.length} Selected`}
                onPress={handlePlaySelected}
                loading={playing}
                fullWidth
                style={{ marginTop: 14 }}
              />
            )}
          </>
        ) : (
          <>
            <GlassCard style={styles.cardMargin}>
              <Text style={styles.label}>✍️ SET YOUR INTENTION</Text>
              <View style={styles.inputBoxSm}>
                <TextInput
                  style={styles.input}
                  placeholder="Today I intend to..."
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={intention}
                  onChangeText={setIntention}
                  onBlur={() => handleSaveIntention(intention)}
                />
              </View>
              {intentionSaved ? <Text style={styles.savedHint}>Set ✨</Text> : null}
            </GlassCard>

            <View style={styles.modeRow}>
              <TouchableOpacity style={[styles.modeCard, createMode === 'ai' && styles.modeCardOn]} onPress={() => setCreateMode('ai')}>
                <Text style={styles.modeIcon}>✨</Text>
                <Text style={styles.modeTitle}>AI</Text>
                <Text style={styles.modeSub}>Generate affirmations for your desire</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeCard, createMode === 'own' && styles.modeCardOn]} onPress={() => setCreateMode('own')}>
                <Text style={styles.modeIcon}>✍️</Text>
                <Text style={styles.modeTitle}>Write Your Own</Text>
                <Text style={styles.modeSub}>Type your affirmations — we narrate them</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.rtgHeaderRow} onPress={() => setRtgExpanded((v) => !v)}>
              <View>
                <Text style={styles.rtgHeading}>✨ Ready To Go Affirmations</Text>
                <Text style={styles.rtgHeadingSub}>Tap to expand · instant sets for any mood</Text>
              </View>
              <Text style={styles.rtgChevron}>{rtgExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {rtgExpanded && (
              <View style={styles.rtgGrid}>
                {RTG_PRESETS.map((p) => (
                  <TouchableOpacity key={p.name} style={styles.rtgGridCard} onPress={() => loadRTG(p)}>
                    <Text style={styles.rtgGridIcon}>{p.ic}</Text>
                    <Text style={styles.rtgGridName}>{p.name}</Text>
                    <Text style={styles.rtgGridSub}>5 affirmations</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.rtgRow}>
              {RTG_QUICK.map((p) => (
                <TouchableOpacity key={p.name} style={styles.rtgCard} onPress={() => loadRTG(p)}>
                  <View style={styles.rtgCardLeft}>
                    <Text style={styles.rtgIcon}>{p.ic}</Text>
                    <View>
                      <Text style={styles.rtgName}>{p.name}</Text>
                      <Text style={styles.rtgSub}>Tap to load & edit</Text>
                    </View>
                  </View>
                  <Text style={styles.rtgLoad}>▶ Load</Text>
                </TouchableOpacity>
              ))}
            </View>

            {createMode === 'ai' ? (
              <>
                <GlassCard style={styles.cardMargin}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { marginBottom: 0, flexShrink: 1 }]}>WHAT DO YOU WANT TO MANIFEST?</Text>
                    <UsageBadge
                      usedToday={aiUsageToday.ai_affirmations}
                      dailyLimit={limits?.ai_affirmations_day}
                      usedMonth={aiUsage.affirmations}
                      monthLimit={limits?.ai_affirmations}
                      featureLabel="AI affirmations"
                    />
                  </View>
                  <ExpandableTextArea
                    value={desire}
                    onChangeText={setDesire}
                    placeholder="e.g. I want to attract financial abundance and feel truly free and secure..."
                    modalTitle="What do you want to manifest?"
                    minHeight={110}
                  />

                  <View style={[styles.inputBoxSm, { marginTop: 10 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Name this set (optional — e.g. Morning Abundance)"
                      placeholderTextColor="rgba(46,37,48,0.4)"
                      value={setName}
                      onChangeText={setSetName}
                    />
                  </View>

                  <Text style={[styles.label, { marginTop: 14 }]}>STYLE (OPTIONAL — LEAVE BLANK TO USE YOUR PREFERENCE)</Text>
                  <View style={styles.chipRow}>
                    {STYLES.map((s) => (
                      <Chip key={s.value} label={s.label} active={style === s.value} onPress={() => setStyle(style === s.value ? '' : s.value)} />
                    ))}
                  </View>

                  <Text style={[styles.label, { marginTop: 14 }]}>NUMBER OF AFFIRMATIONS: {count}</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => setCount(Math.max(1, count - 1))}><Text style={styles.stepperText}>−</Text></TouchableOpacity>
                    <Text style={styles.stepperVal}>{count}</Text>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => setCount(Math.min(20, count + 1))}><Text style={styles.stepperText}>+</Text></TouchableOpacity>
                  </View>

                  <Text style={[styles.label, { marginTop: 14 }]}>REPEAT EACH: {repeatCount}×</Text>
                  <View style={styles.presetRow}>
                    {[1, 11, 33, 108, 1000].map((n) => (
                      <Chip key={n} label={`${n}×`} active={repeatCount === n} onPress={() => setRepeatCount(n)} />
                    ))}
                  </View>

                  <Text style={[styles.label, { marginTop: 14 }]}>VOICE</Text>
                  <View style={styles.chipRow}>
                    {VOICES.map((v) => {
                      // System = device TTS, nothing rendered server-side, so it's
                      // never plan-locked.
                      const allowed = v.id === 'system' || voicesAllowed.includes(v.id);
                      return (
                        <Chip
                          key={v.id}
                          label={`${v.label}${!allowed ? ' 🔒' : ''}`}
                          active={voice === v.id}
                          locked={!allowed}
                          onPress={() => allowed ? setVoice(v.id) : (setUpgradeMsg(`${v.label} is available on paid plans -- upgrade to unlock every voice.`), setShowUpgrade(true))}
                        />
                      );
                    })}
                  </View>

                  {loaded && !canGenerateAi ? (
                    <Text style={styles.upsellHint}>✨ AI generation is a Basic Manifestor feature — try Write Your Own for free, or upgrade.</Text>
                  ) : null}
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <View style={styles.actionRow}>
                    <Button title="Generate & Play ✨" onPress={handleGenerate} loading={generating} style={{ flex: 1 }} />
                    <Button
                      title="Clear"
                      variant="ghost"
                      onPress={() => { setDesire(''); setSetName(''); setStyle(''); setCurrent(null); setError(''); }}
                    />
                  </View>
                </GlassCard>

                {current && (
                  <GlassCard style={styles.cardMargin}>
                    <Text style={styles.label}>{current.desire}</Text>
                    {current.affirmations.map((line, i) => (
                      <Text key={i} style={styles.affLine}>{line}</Text>
                    ))}
                    <Button title="Play Audio 🔊" onPress={() => playLines(current.affirmations, current.id, current.audio_url)} loading={playing} fullWidth style={{ marginTop: 14 }} />
                  </GlassCard>
                )}
              </>
            ) : (
              <>
                <GlassCard style={styles.cardMargin}>
                  <Text style={styles.helperText}>Write your own affirmations — no AI cost, works on every plan (up to your set limit).</Text>

                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { marginBottom: 0, flexShrink: 1 }]}>YOUR AFFIRMATIONS — ONE PER LINE</Text>
                    <UsageBadge
                      usedToday={aiUsageToday.own_affirmations}
                      dailyLimit={limits?.own_affirmations_day}
                      usedMonth={aiUsage.own_affirmations}
                      monthLimit={limits?.own_affirmations_month ?? limits?.own_affirmations_total}
                      featureLabel="own affirmations"
                    />
                  </View>
                  <ExpandableTextArea
                    value={ownText}
                    onChangeText={setOwnText}
                    placeholder={'I am worthy of love\nI attract abundance easily\nI am healthy, happy and free...'}
                    modalTitle="Your Affirmations"
                    minHeight={130}
                  />

                  <View style={[styles.inputBoxSm, { marginTop: 10 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Name this set (optional — e.g. Morning Confidence)"
                      placeholderTextColor="rgba(46,37,48,0.4)"
                      value={ownTitle}
                      onChangeText={setOwnTitle}
                    />
                  </View>

                  <Text style={[styles.label, { marginTop: 14 }]}>VOICE</Text>
                  <View style={styles.chipRow}>
                    {VOICES.map((v) => {
                      // System = device TTS, nothing rendered server-side, so it's
                      // never plan-locked.
                      const allowed = v.id === 'system' || voicesAllowed.includes(v.id);
                      return (
                        <Chip
                          key={v.id}
                          label={`${v.label}${!allowed ? ' 🔒' : ''}`}
                          active={voice === v.id}
                          locked={!allowed}
                          onPress={() => allowed ? setVoice(v.id) : (setUpgradeMsg(`${v.label} is available on paid plans.`), setShowUpgrade(true))}
                        />
                      );
                    })}
                  </View>

                  {ownCap != null ? (
                    <Text style={styles.upsellHint}>{ownUsedCount} / {ownCap} free own affirmations used</Text>
                  ) : null}
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <View style={styles.actionRow}>
                    <Button title="💾 Save to Library" onPress={handleSaveOwn} loading={savingOwn} style={{ flex: 1 }} />
                    <Button
                      title="Clear"
                      variant="ghost"
                      onPress={() => { setOwnText(''); setOwnTitle(''); setCurrent(null); setError(''); }}
                    />
                  </View>
                </GlassCard>

                {current && (
                  <GlassCard style={styles.cardMargin}>
                    <Text style={styles.label}>{current.desire}</Text>
                    {current.affirmations.map((line, i) => (
                      <Text key={i} style={styles.affLine}>{line}</Text>
                    ))}
                    <Button title="Play Audio 🔊" onPress={() => playLines(current.affirmations, current.id, current.audio_url)} loading={playing} fullWidth style={{ marginTop: 14 }} />
                  </GlassCard>
                )}
              </>
            )}
          </>
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
  helperText: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginBottom: 10, lineHeight: 18 },
  inputBoxSm: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'center' },
  upsellHint: { fontFamily: fonts.displayItalic, fontSize: 12.5, color: colors.purpleDark, marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
  savedHint: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.success, marginTop: 8, textAlign: 'center', fontWeight: '600' },
  cardMargin: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  inputBox: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)', minHeight: 60 },
  input: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginVertical: 10, textAlign: 'center' },
  affLine: { fontFamily: fonts.displayItalic, color: colors.ink2, fontSize: 17, marginBottom: 10, lineHeight: 25, fontStyle: 'italic' },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, textAlign: 'center', marginTop: 10 },

  /* mode toggle cards (AI vs Write Your Own) */
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  modeCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.md, padding: 16, alignItems: 'center' },
  modeCardOn: { backgroundColor: 'rgba(248,184,200,0.18)', borderColor: colors.pinkAccent },
  modeIcon: { fontSize: 22, marginBottom: 6 },
  modeTitle: { fontFamily: fonts.displayItalic, fontSize: 16, color: colors.ink, fontStyle: 'italic', marginBottom: 4 },
  modeSub: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, textAlign: 'center', lineHeight: 15 },

  /* Ready To Go — collapsible header + full grid + quick rows */
  rtgHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rtgHeading: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.purpleDark, fontWeight: '600' },
  rtgHeadingSub: { fontFamily: fonts.body, fontSize: 11, color: colors.mist2, marginTop: 2 },
  rtgChevron: { fontSize: 12, color: colors.purpleDark },

  rtgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  rtgGridCard: { width: '31.5%', backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center' },
  rtgGridIcon: { fontSize: 20, marginBottom: 6 },
  rtgGridName: { fontFamily: fonts.bodyMedium, fontSize: 11, fontWeight: '600', color: colors.purpleDark, textAlign: 'center' },
  rtgGridSub: { fontFamily: fonts.body, fontSize: 9.5, color: colors.mist2, marginTop: 3 },

  rtgRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  rtgCard: { flex: 1, minWidth: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.sm, paddingVertical: 8, paddingHorizontal: 10 },
  rtgCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  rtgIcon: { fontSize: 14 },
  rtgName: { fontFamily: fonts.bodyMedium, fontSize: 11, fontWeight: '600', color: colors.ink },
  rtgSub: { fontFamily: fonts.body, fontSize: 9, color: colors.mist2 },
  rtgLoad: { fontFamily: fonts.bodyMedium, fontSize: 9, color: colors.purpleDark, fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  /* Multiple Load checkbox */
  multiLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.5)', backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.purpleAccent, borderColor: colors.purpleAccent },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: '700' },
  multiLoadText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2, fontWeight: '600' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', alignItems: 'center', justifyContent: 'center' },
  stepperText: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.purpleDark, fontWeight: '700' },
  stepperVal: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ink, fontWeight: '600' },

  libGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  libCard: { width: '48.5%', backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, padding: 10 },
  libCardSelected: { borderColor: colors.pinkAccent, backgroundColor: 'rgba(248,184,200,0.18)' },
  libTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, fontWeight: '600', color: colors.ink },
  libMeta: { fontFamily: fonts.body, fontSize: 10, color: colors.mist2, marginTop: 2, marginBottom: 8 },
  libBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  libIconBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  libIconText: { fontSize: 13 },
});
