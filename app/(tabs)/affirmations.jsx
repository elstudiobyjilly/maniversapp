import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { Audio } from 'expo-av';
import {
  generateAffirmation, getAffirmations, getAffirmationAudio,
  favoriteAffirmation, pinAffirmation, deleteAffirmation, getPinnedSets,
  saveOwnAffirmationSet, getAffirmationAudioStatus, createCheckout,
  renameAffirmationSet, regenerateAffirmationAudio,
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

const STYLES = [
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

const RTG_PRESETS = [
  { ic: '⭕', name: "Ho'oponopono", affs: ["I'm sorry. Please forgive me. Thank you. I love you.", 'I release all that no longer serves my highest good', 'I forgive myself completely and unconditionally', 'I am healed, whole and at peace with my past', 'Love flows through me, clearing all resistance now'] },
  { ic: '🌙', name: 'Sleep Programming', affs: ['As I sleep, my subconscious receives my desires', 'My body and mind regenerate beautifully overnight', 'I wake up having already manifested in my sleep', 'Abundance flows to me even as I rest and dream', 'My subconscious is now programmed for success and joy'] },
];

export default function Affirmations() {
  const { limits, loaded, hasFeature, allowedVoices, refresh } = usePlanStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  // 'create' = AI-generated, 'own' = write-your-own, 'library' = saved sets
  const [tab, setTab] = useState('create');
  const [desire, setDesire] = useState('');
  const [style, setStyle] = useState('');
  const [count, setCount] = useState(5);
  const [repeatCount, setRepeatCount] = useState(10);
  const [voice, setVoice] = useState('luna');
  const [generating, setGenerating] = useState(false);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);

  // Write-your-own state
  const [ownTitle, setOwnTitle] = useState('');
  const [ownLines, setOwnLines] = useState(['']);
  const [savingOwn, setSavingOwn] = useState(false);

  const [library, setLibrary] = useState([]);
  const [loadingLib, setLoadingLib] = useState(false);
  const [pinnedIds, setPinnedIds] = useState([]);

  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVoice, setEditVoice] = useState('luna');
  const [editSaving, setEditSaving] = useState(false);
  const [regenAudioLoading, setRegenAudioLoading] = useState(false);

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

  useEffect(() => { refresh(); loadLibrary(); }, []);
  useEffect(() => { if (tab === 'library') loadLibrary(); }, [tab]);

  const stopSound = async () => { if (sound) { try { await sound.unloadAsync(); } catch (_) {} } setSound(null); setPlaying(false); };

  const handleGenerate = async () => {
    if (!canGenerateAi) {
      setUpgradeMsg('AI-generated affirmations are a Basic Manifestor feature. Try Write Your Own for free, or upgrade for AI generation + all voices.');
      setShowUpgrade(true);
      return;
    }
    if (!desire.trim()) { setError('Describe what you want to manifest.'); return; }
    setError(''); setGenerating(true);
    try {
      const result = await generateAffirmation(desire.trim(), { count, repeat_count: repeatCount, style, voice_id: voice });
      setCurrent(result);
      // Poll for background TTS completion so Play works with cached audio
      // instead of a redundant live TTS call once it's ready.
      pollAudioStatus(result.id);
    } catch (e) {
      if (e.status === 403) { setUpgradeMsg(e.message || 'Upgrade to generate AI affirmations.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not generate affirmations');
    } finally { setGenerating(false); }
  };

  // Write-your-own: counts against own_affirmations_total (free: 20 total
  // ever) / own_affirmations_per_month (paid) -- separate pool from AI gen.
  const handleSaveOwn = async () => {
    const cleanLines = ownLines.map((l) => l.trim()).filter(Boolean);
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
      setOwnTitle(''); setOwnLines(['']);
    } catch (e) {
      if (e.status === 403 || e.status === 429) { setUpgradeMsg(e.message || 'Upgrade for more own affirmations.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not save affirmations');
    } finally { setSavingOwn(false); }
  };

  const pollAudioStatus = (affId, attempts = 0) => {
    if (attempts > 15) return; // ~30s max -- background generation may still be running, that's fine
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
      // Prefer already-generated cached audio over a fresh live TTS call.
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
      newSound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) setPlaying(false); });
    } catch (e) {
      setError(e.message || 'Could not play audio');
      setPlaying(false);
    }
  };

  const loadRTG = (preset) => {
    setCurrent({ id: 0, desire: preset.name, affirmations: preset.affs, repeat_count: 10 });
    setDesire(preset.name);
  };

  const handleFavorite = async (id) => { try { await favoriteAffirmation(id); loadLibrary(); } catch (_) {} };
  const handlePin = async (id) => { try { await pinAffirmation(id); loadLibrary(); } catch (_) {} };
  const handleDelete = async (id) => { try { await deleteAffirmation(id); setLibrary((l) => l.filter((a) => a.id !== id)); } catch (_) {} };

  const openEdit = (item) => {
    setEditing(item);
    setEditTitle(item.desire || '');
    setEditVoice(item.voice_id || 'luna');
  };

  const handleSaveRename = async () => {
    if (!editing) return;
    if (!editTitle.trim()) { Alert.alert('Enter a title ✨'); return; }
    setEditSaving(true);
    try {
      await renameAffirmationSet(editing.id, editTitle.trim());
      setLibrary((prev) => prev.map((a) => (a.id === editing.id ? { ...a, desire: editTitle.trim() } : a)));
      setEditing((prev) => (prev ? { ...prev, desire: editTitle.trim() } : prev));
      Alert.alert('Renamed ✨');
    } catch (e) {
      Alert.alert('Could not rename', e.message || 'Please try again.');
    } finally { setEditSaving(false); }
  };

  const handleRegenerateVoice = async () => {
    if (!editing) return;
    const allowed = voicesAllowed.includes(editVoice);
    if (!allowed) { setUpgradeMsg(`${VOICES.find((v) => v.id === editVoice)?.label || 'This voice'} is available on paid plans.`); setShowUpgrade(true); return; }
    setRegenAudioLoading(true);
    try {
      await regenerateAffirmationAudio(editing.id, editVoice);
      setLibrary((prev) => prev.map((a) => (a.id === editing.id ? { ...a, voice_id: editVoice, audio_url: null } : a)));
      Alert.alert('Voice changed — audio is regenerating ✨');
    } catch (e) {
      Alert.alert('Could not change voice', e.message || 'Please try again.');
    } finally { setRegenAudioLoading(false); }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <ScreenHeader lead="Your" accent="Affirmations" subtitle="Craft powerful affirmations from your desire, or speak your own." />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'create', label: '✨ AI Create' },
            { value: 'own', label: '✍️ Write Own' },
            { value: 'library', label: '📚 Library' },
          ]}
        />

        {tab === 'create' ? (
          <>
            {/* RTG quick cards — compact size */}
            <View style={styles.rtgRow}>
              {RTG_PRESETS.map((p) => (
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

            <GlassCard style={styles.cardMargin}>
              <Text style={styles.label}>WHAT DO YOU WANT TO MANIFEST?</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. I want to attract financial abundance and feel truly free and secure..."
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={desire}
                  onChangeText={setDesire}
                  multiline
                />
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>STYLE (OPTIONAL)</Text>
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
                  const allowed = voicesAllowed.includes(v.id);
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
              <Button title="Generate & Play ✨" onPress={handleGenerate} loading={generating} fullWidth style={{ marginTop: 14 }} />
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
        ) : tab === 'own' ? (
          <>
            <GlassCard style={styles.cardMargin}>
              <Text style={styles.helperText}>Write your own affirmations — no AI cost, works on every plan (up to your set limit).</Text>
              <Text style={styles.label}>TITLE (OPTIONAL)</Text>
              <View style={styles.inputBoxSm}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. My Money Affirmations"
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={ownTitle}
                  onChangeText={setOwnTitle}
                />
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>YOUR AFFIRMATIONS</Text>
              {ownLines.map((line, i) => (
                <View key={i} style={[styles.inputBox, { marginBottom: 8, minHeight: 44 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder={`Affirmation ${i + 1}...`}
                    placeholderTextColor="rgba(46,37,48,0.4)"
                    value={line}
                    onChangeText={(t) => setOwnLines((prev) => prev.map((l, idx) => (idx === i ? t : l)))}
                    multiline
                  />
                </View>
              ))}
              {ownLines.length < 10 && (
                <TouchableOpacity style={styles.addLineBtn} onPress={() => setOwnLines((prev) => [...prev, ''])}>
                  <Text style={styles.addLineBtnText}>+ Add Line</Text>
                </TouchableOpacity>
              )}

              <Text style={[styles.label, { marginTop: 14 }]}>VOICE</Text>
              <View style={styles.chipRow}>
                {VOICES.map((v) => {
                  const allowed = voicesAllowed.includes(v.id);
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
              <Button title="💾 Save My Affirmations" onPress={handleSaveOwn} loading={savingOwn} fullWidth style={{ marginTop: 14 }} />
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
            {loadingLib ? (
              <Text style={styles.muted}>Loading your library...</Text>
            ) : library.length === 0 ? (
              <Text style={styles.muted}>No affirmation sets yet — generate your first one ✨</Text>
            ) : (
              <View style={styles.libGrid}>
                {library.map((item) => (
                  <View key={item.id} style={styles.libCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.libTitle} numberOfLines={1}>{item.desire || 'Affirmations'}</Text>
                      {item.locked ? <Text style={{ fontSize: 10 }}>🔒</Text> : null}
                    </View>
                    <Text style={styles.libMeta}>{item.affirmations?.length || 0} affs · {item.repeat_count}× · {item.source === 'own' ? 'Own' : 'AI'}</Text>
                    <View style={styles.libBtnRow}>
                      <Button
                        title="▶ Load"
                        size="xs"
                        style={{ flex: 1 }}
                        disabled={item.locked}
                        onPress={() => item.locked ? (setUpgradeMsg('This set is locked — upgrade to use it again.'), setShowUpgrade(true)) : (setCurrent(item), setTab(item.source === 'own' ? 'own' : 'create'))}
                      />
                      <TouchableOpacity style={styles.libIconBtn} onPress={() => handleFavorite(item.id)}>
                        <Text style={styles.libIconText}>{item.is_favorite ? '★' : '☆'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.libIconBtn} onPress={() => handlePin(item.id)}>
                        <Text style={styles.libIconText}>{pinnedIds.includes(item.id) ? '📌' : '📍'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.libIconBtn} onPress={() => openEdit(item)}>
                        <Text style={styles.libIconText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.libIconBtn} onPress={() => handleDelete(item.id)}>
                        <Text style={styles.libIconText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
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

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Affirmation Set</Text>

            <Text style={styles.label}>TITLE</Text>
            <View style={styles.inputBoxSm}>
              <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} placeholder="Set title" placeholderTextColor="rgba(46,37,48,0.4)" />
            </View>
            <Button title="Save Title" variant="ghost" size="sm" onPress={handleSaveRename} loading={editSaving} style={{ marginTop: 8, alignSelf: 'flex-start' }} />

            <Text style={[styles.label, { marginTop: 16 }]}>VOICE</Text>
            <View style={styles.chipRow}>
              {VOICES.map((v) => {
                const allowed = voicesAllowed.includes(v.id);
                return (
                  <Chip
                    key={v.id}
                    label={`${v.label}${!allowed ? ' 🔒' : ''}`}
                    active={editVoice === v.id}
                    locked={!allowed}
                    onPress={() => setEditVoice(v.id)}
                  />
                );
              })}
            </View>

            <Button title="🎙️ Regenerate Audio in This Voice" variant="ghost" onPress={handleRegenerateVoice} loading={regenAudioLoading} fullWidth style={{ marginTop: 14 }} />

            <TouchableOpacity onPress={() => setEditing(null)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  helperText: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginBottom: 10, lineHeight: 18 },
  inputBoxSm: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  addLineBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 4 },
  addLineBtnText: { fontFamily: fonts.bodyMedium, color: colors.purpleDark, fontSize: 12, fontWeight: '600' },
  upsellHint: { fontFamily: fonts.displayItalic, fontSize: 12.5, color: colors.purpleDark, marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
  cardMargin: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  inputBox: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)', minHeight: 60 },
  input: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginVertical: 10, textAlign: 'center' },
  affLine: { fontFamily: fonts.displayItalic, color: colors.ink2, fontSize: 17, marginBottom: 10, lineHeight: 25, fontStyle: 'italic' },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, textAlign: 'center', marginTop: 10 },

  /* compact RTG preset cards */
  rtgRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  rtgCard: { flex: 1, minWidth: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.sm, paddingVertical: 8, paddingHorizontal: 10 },
  rtgCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  rtgIcon: { fontSize: 14 },
  rtgName: { fontFamily: fonts.bodyMedium, fontSize: 11, fontWeight: '600', color: colors.ink },
  rtgSub: { fontFamily: fonts.body, fontSize: 9, color: colors.mist2 },
  rtgLoad: { fontFamily: fonts.bodyMedium, fontSize: 9, color: colors.purpleDark, fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', alignItems: 'center', justifyContent: 'center' },
  stepperText: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.purpleDark, fontWeight: '700' },
  stepperVal: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ink, fontWeight: '600' },

  libGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  libCard: { width: '48.5%', backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, padding: 10 },
  libTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, fontWeight: '600', color: colors.ink },
  libMeta: { fontFamily: fonts.body, fontSize: 10, color: colors.mist2, marginTop: 2, marginBottom: 8 },
  libBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  libIconBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  libIconText: { fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(46,37,48,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fffaf3', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalTitle: { fontFamily: fonts.displayMedium, fontSize: 19, fontWeight: '400', color: colors.ink, marginBottom: 16 },
  cancelText: { fontFamily: fonts.body, color: colors.mist, fontSize: 13.5, fontWeight: '500' },
});