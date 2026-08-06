import { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Dropdown from '../../components/Dropdown';
import TabPill from '../../components/TabPill';
import {
  getIdentity, saveIdentity,
  getFutureSelf, saveFutureSelf,
  getKv, saveKv,
  getItemAudio,
} from '../../services/api';
import { usePlanStore } from '../../store/planStore';
import ExpandableTextArea from '../../components/ExpandableTextArea';
import { colors, fonts, radii, shadows, spacing } from '../../constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const IDENTITY_AREAS = [
  { id: 'money',        ic: '💰', label: 'Money & Abundance' },
  { id: 'love',         ic: '💕', label: 'Love & Relationships' },
  { id: 'health',       ic: '🌿', label: 'Health & Body' },
  { id: 'career',       ic: '✨', label: 'Career & Purpose' },
  { id: 'selfworth',    ic: '🌸', label: 'Self-Worth & Confidence' },
  { id: 'spirituality', ic: '🔮', label: 'Spirituality & Growth' },
];

const BRIDGE_TOPICS = [
  { value: 'general',   label: 'General',  emoji: '✨' },
  { value: 'money',     label: 'Money',    emoji: '💰' },
  { value: 'love',      label: 'Love',     emoji: '💕' },
  { value: 'health',    label: 'Health',   emoji: '🌿' },
  { value: 'career',    label: 'Career',   emoji: '🚀' },
  { value: 'becoming',  label: 'Becoming', emoji: '🦋' },
];
function bridgeTopicMeta(value) {
  return BRIDGE_TOPICS.find(t => t.value === value) || BRIDGE_TOPICS[0];
}

// Ported exactly (verbatim strings) from the website's cards.js "Choose a topic" row.
const LETTER_TOPICS = [
  'A letter about my money story',
  'A letter about love and relationships',
  'A letter about my health journey',
  'A letter about my career and purpose',
  'A letter about who I am becoming',
  'A letter from my future self',
];
// "Writing Prompts" quick-start row -- seeds the letter body with a starter.
const LETTER_PROMPTS = [
  { label: 'Future Me', text: "Dear present self, I'm writing to you from the life you always dreamed of. Everything you've been working toward has unfolded, and I want you to know..." },
  { label: 'The Day', text: 'Dear future me, today I want to remember how it felt to hope for this. I am choosing to trust the process, even on the days it feels slow...' },
  { label: 'Worth It', text: "Dear future me, I need you to know that all of it was worth it — every early morning, every moment of doubt, every time I chose to keep going. Here's what I want you to remember..." },
  { label: 'Past Me', text: "Dear past me, I know you're scared and unsure right now. I'm writing from the other side to tell you it works out, and here's what I learned along the way..." },
  { label: '+Already Here', text: 'Dear present self, some of what you asked for is already here — you just haven\'t noticed yet. Let me remind you...' },
];

const FS_ACTIONS = {
  general: [
    'Speak one affirmation out loud as your future self',
    'Write 3 things your future self is grateful for',
    'Do one thing today your future self would do',
    'Read your daily portrait',
    'Visualise your future self for 2 minutes before sleeping',
  ],
  love: [
    'Write one quality you embody that attracts love',
    'Do something loving for yourself today',
    'Speak: I am worthy of deep real love',
    'Visualise your ideal relationship as already real',
    'Write how love feels in your body right now',
  ],
  money: [
    'Write: Money flows to me easily and often',
    'Notice one way abundance already shows up in your life',
    'Do one thing a wealthy abundant version of you would do',
    'Write 3 ways you already have more than enough',
    'Visualise your bank account and feel grateful for it',
  ],
  health: [
    'Drink a full glass of water with intention',
    'Move your body for 10 minutes as your healthy self',
    'Write: My body is strong healthy and well',
    'Rest without guilt — your body deserves it',
    'Notice one thing your body does well today',
  ],
  career: [
    'Write one sentence describing your ideal work day as already real',
    'Take one small step toward your purpose today',
    'Speak: I am doing work that matters and I am paid well for it',
    'Write what success feels like in your body',
    'Do one thing today that moves you closer to your goal',
  ],
};

const ACTION_CATEGORIES = ['general', 'love', 'money', 'health', 'career'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Shared fullscreen reading modal ─────────────────────────────────────────
function ReadModal({ visible, title, body, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.readModalScroll}>
          <View style={styles.readModalHeader}>
            <Text style={styles.readModalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.readModalClose}>
              <Text style={styles.readModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <GlassCard>
            <Text style={styles.readModalBody}>{body}</Text>
          </GlassCard>
        </ScrollView>
      </GradientBackground>
    </Modal>
  );
}

// Free plan allows up to 10 identity statements total across every area
// (built-in + custom combined) -- ported exactly from the website's
// MAX_STMTS_TOTAL constant in cards.js.
const MAX_IDENTITY_STMTS = 10;

// Statements are rendered inline per-category. Since typing a draft for
// ANY category lives in the same IdentityTab component that owns every
// category's statement list, isolating that list in its own memoized
// component (mirroring the fix applied to Community Wall's feed) keeps a
// keystroke in one category's "+Add" box from forcing every other
// category's statement list to re-render too.
const StatementsList = memo(function StatementsList({ areaId, stmts, onRemove }) {
  if (stmts.length === 0) {
    return <Text style={styles.identityEmptyText}>Tap + Add to define your identity here...</Text>;
  }
  return stmts.map((s, i) => (
    <View key={i} style={styles.stmtRow}>
      <View style={styles.stmtAccentBar} />
      <Text style={styles.stmtText}>{s}</Text>
      <TouchableOpacity onPress={() => onRemove(areaId, i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Text style={styles.stmtRemove}>✕</Text>
      </TouchableOpacity>
    </View>
  ));
});

// The backend has no ordering field for identity areas, so the order the
// user drags them into on-device is mirrored under this key (same
// on-device-workaround pattern used for Desire Action's start dates).
const IDENTITY_ORDER_KEY = 'mv_fs_identity_order';
// Estimate used for a card's height before its first onLayout measurement
// fires (cards vary a lot -- 0 statements vs 5 -- so this is only a
// placeholder until the real height is known).
const DEFAULT_AREA_HEIGHT = 90;

// Sum of every id's height up to (not including) `slot`, given the current
// slot assignment. Cards have very different heights (0 vs 5 statements),
// so position is computed from cumulative real heights rather than a fixed
// row height.
function offsetForSlot(positions, heights, slot) {
  'worklet';
  let y = 0;
  const ids = Object.keys(positions);
  for (let i = 0; i < ids.length; i++) {
    if (positions[ids[i]] < slot) y += heights[ids[i]] ?? DEFAULT_AREA_HEIGHT;
  }
  return y;
}

// One draggable identity-area card. `positions`/`heights` are shared values
// owned by the parent list ({ [id]: slotIndex } / { [id]: measuredHeight }).
// Dragging the header continuously re-derives where `id` should sit among
// the *other* cards by comparing the dragged card's center against their
// cumulative offsets, then reassigns every id's slot from that -- so cards
// smoothly reflow around the one being dragged regardless of height.
function DraggableAreaCard({ id, positions, heights, onReorderCommit, onMeasured, children }) {
  const translateY = useSharedValue(offsetForSlot(positions.value, heights.value, positions.value[id] ?? 0));
  const isDragging = useSharedValue(false);
  const startY = useSharedValue(0);

  useAnimatedReaction(
    () => ({ pos: positions.value, h: heights.value }),
    (cur) => {
      if (!isDragging.value) {
        const target = offsetForSlot(cur.pos, cur.h, cur.pos[id] ?? 0);
        translateY.value = withSpring(target, { damping: 22, stiffness: 220 });
      }
    }
  );

  const gesture = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      isDragging.value = true;
      startY.value = offsetForSlot(positions.value, heights.value, positions.value[id] ?? 0);
    })
    .onUpdate((e) => {
      translateY.value = startY.value + e.translationY;
      const heightsV = heights.value;
      const positionsV = positions.value;
      const myHeight = heightsV[id] ?? DEFAULT_AREA_HEIGHT;
      const myCenter = translateY.value + myHeight / 2;

      const others = Object.keys(positionsV).filter((k) => k !== id).sort((a, b) => positionsV[a] - positionsV[b]);
      let cursor = 0;
      let insertAt = others.length;
      for (let i = 0; i < others.length; i++) {
        const oh = heightsV[others[i]] ?? DEFAULT_AREA_HEIGHT;
        if (myCenter < cursor + oh / 2) { insertAt = i; break; }
        cursor += oh;
      }

      const next = [...others];
      next.splice(insertAt, 0, id);
      const nextPositions = {};
      next.forEach((oid, idx) => { nextPositions[oid] = idx; });
      positions.value = nextPositions;
    })
    .onEnd(() => {
      translateY.value = withSpring(offsetForSlot(positions.value, heights.value, positions.value[id] ?? 0), { damping: 22, stiffness: 220 });
      isDragging.value = false;
      runOnJS(onReorderCommit)(positions.value);
    });

  const style = useAnimatedStyle(() => ({
    position: 'absolute', left: 0, right: 0, top: 0,
    transform: [{ translateY: translateY.value }],
    zIndex: isDragging.value ? 50 : 1,
    shadowOpacity: isDragging.value ? 0.22 : 0,
    shadowRadius: isDragging.value ? 14 : 0,
  }));

  return (
    <Animated.View
      style={[styles.draggableAreaWrap, style]}
      onLayout={(e) => onMeasured(id, e.nativeEvent.layout.height)}
    >
      {children(gesture)}
    </Animated.View>
  );
}

// ─── TAB 1 — Identity ─────────────────────────────────────────────────────────
function IdentityTab() {
  const isPaid = usePlanStore((s) => s.isPaid);
  const EMPTY = Object.fromEntries(IDENTITY_AREAS.map(a => [a.id, []]));
  const [areas, setAreas] = useState({ ...EMPTY, _custom: [] });
  const [drafts, setDrafts] = useState({});
  const [addingTo, setAddingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addingArea, setAddingArea] = useState(false);
  const [newAreaIc, setNewAreaIc] = useState('');
  const [newAreaLabel, setNewAreaLabel] = useState('');
  const [order, setOrder] = useState(null);
  const [heights, setHeights] = useState({});
  const positionsSV = useSharedValue({});
  const heightsSV = useSharedValue({});

  useEffect(() => {
    getIdentity()
      .then(data => {
        // Backend stores flat: { money: [...], love: [...], ..., _custom: [{id,ic,label}] }
        setAreas(prev => ({ ...prev, ...data }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    AsyncStorage.getItem(IDENTITY_ORDER_KEY)
      .then(raw => { if (raw) { try { setOrder(JSON.parse(raw)); } catch (_) {} } })
      .catch(() => {});
  }, []);

  const customAreas = (areas._custom || []).filter(a => a && a.id && a.label);
  const allAreas = [...IDENTITY_AREAS, ...customAreas];
  const orderedAreas = (() => {
    if (!order) return allAreas;
    const byId = Object.fromEntries(allAreas.map(a => [a.id, a]));
    const known = order.filter(id => byId[id]);
    const missing = allAreas.filter(a => !known.includes(a.id));
    return [...known.map(id => byId[id]), ...missing];
  })();
  const totalStmts = Object.keys(areas).reduce((sum, k) => (k === '_custom' ? sum : sum + (Array.isArray(areas[k]) ? areas[k].length : 0)), 0);

  // Keep the drag layer's shared values in sync with the current display
  // order / measured heights so dragging always starts from where the
  // cards actually are.
  useEffect(() => {
    positionsSV.value = Object.fromEntries(orderedAreas.map((a, i) => [a.id, i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedAreas.map(a => a.id).join('|')]);

  useEffect(() => {
    heightsSV.value = heights;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heights]);

  const handleMeasured = useCallback((id, h) => {
    setHeights(prev => (Math.abs((prev[id] || 0) - h) > 0.5 ? { ...prev, [id]: h } : prev));
  }, []);

  const handleReorderCommit = useCallback((posMap) => {
    const newOrder = Object.entries(posMap).sort((a, b) => a[1] - b[1]).map(([rid]) => rid);
    setOrder(newOrder);
    AsyncStorage.setItem(IDENTITY_ORDER_KEY, JSON.stringify(newOrder)).catch(() => {});
  }, []);

  const totalAreasHeight = orderedAreas.reduce((sum, a) => sum + (heights[a.id] ?? DEFAULT_AREA_HEIGHT), 0);

  const persist = async (next) => {
    setAreas(next);
    setSaving(true);
    try { await saveIdentity(next); } catch (_) {}
    finally { setSaving(false); }
  };

  const addStatement = async (areaId) => {
    const text = (drafts[areaId] || '').trim();
    if (!text) return;
    if (!isPaid() && totalStmts >= MAX_IDENTITY_STMTS) {
      setError(`Free plan allows up to ${MAX_IDENTITY_STMTS} identity statements — upgrade for unlimited ✨`);
      return;
    }
    setError('');
    const next = { ...areas, [areaId]: [...(areas[areaId] || []), text] };
    setDrafts(prev => ({ ...prev, [areaId]: '' }));
    setAddingTo(null);
    await persist(next);
  };

  // useCallback with [areas] so the reference only changes when the actual
  // data changes (not on every drafts/addingTo keystroke) -- required for
  // StatementsList's memo() to be effective.
  const removeStatement = useCallback(async (areaId, idx) => {
    const next = { ...areas, [areaId]: areas[areaId].filter((_, i) => i !== idx) };
    await persist(next);
  }, [areas]);

  const clearArea = (areaId) => {
    Alert.alert('Clear all statements in this area?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => persist({ ...areas, [areaId]: [] }) },
    ]);
  };

  const removeCustomArea = (areaId) => {
    Alert.alert('Remove this area?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const next = { ...areas };
        next._custom = (next._custom || []).filter(a => a.id !== areaId);
        delete next[areaId];
        persist(next);
      } },
    ]);
  };

  const confirmNewArea = () => {
    const label = newAreaLabel.trim();
    if (!label) return;
    const ic = newAreaIc.trim() || '✨';
    const id = 'custom_' + Date.now();
    const next = { ...areas, _custom: [...(areas._custom || []), { id, ic, label }], [id]: [] };
    setAddingArea(false); setNewAreaIc(''); setNewAreaLabel('');
    persist(next);
  };

  if (loading) return <ActivityIndicator color="#c9a8c9" style={{ marginTop: 40 }} />;

  return (
    <View>
      <Text style={styles.tabIntro}>Write identity statements for each area of life. "I am someone who..." — be honest, be bold, be expansive.</Text>
      <Text style={styles.reorderHintInline}>Hold ☰ on a card's header and drag to rearrange ✨</Text>

      {addingArea ? (
        <View style={styles.newAreaBox}>
          <Text style={styles.newAreaLabel}>NEW LIFE AREA</Text>
          <View style={styles.newAreaRow}>
            <TextInput style={styles.newAreaIcInput} placeholder="🎨" maxLength={2} value={newAreaIc} onChangeText={setNewAreaIc} />
            <TextInput style={styles.newAreaNameInput} placeholder="e.g. Creativity, Travel, Family..." placeholderTextColor="#9a8896" value={newAreaLabel} onChangeText={setNewAreaLabel} />
            <TouchableOpacity style={styles.newAreaAddBtn} onPress={confirmNewArea}><Text style={styles.newAreaAddBtnText}>✓ Add</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setAddingArea(false); setNewAreaIc(''); setNewAreaLabel(''); }}><Text style={styles.newAreaCancelText}>✕</Text></TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={{ height: totalAreasHeight }}>
        {orderedAreas.map(area => {
          const stmts = areas[area.id] || [];
          const isCustom = customAreas.some(c => c.id === area.id);
          return (
            <DraggableAreaCard
              key={area.id}
              id={area.id}
              positions={positionsSV}
              heights={heightsSV}
              onReorderCommit={handleReorderCommit}
              onMeasured={handleMeasured}
            >
              {(gesture) => (
                <GlassCard style={styles.identityBlock} noPadding>
                  <View style={styles.identityBlockHeader}>
                    <GestureDetector gesture={gesture}>
                      <View style={styles.dragHandleWrap} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={styles.dragHandleIcon}>☰</Text>
                      </View>
                    </GestureDetector>
                    <Text style={styles.accordionIcon}>{area.ic}</Text>
                    <Text style={styles.accordionLabel} numberOfLines={1}>{area.label}</Text>
                    {stmts.length > 0 && (
                      <View style={styles.accordionBadge}>
                        <Text style={styles.accordionBadgeText}>{stmts.length}</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => setAddingTo(addingTo === area.id ? null : area.id)} style={styles.identityAddPill}>
                      <Text style={styles.identityAddPillText}>+ Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => isCustom ? removeCustomArea(area.id) : clearArea(area.id)} style={styles.identityRemoveBtn}>
                      <Text style={styles.identityRemoveBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.identityBlockBody}>
                    <StatementsList areaId={area.id} stmts={stmts} onRemove={removeStatement} />
                    {addingTo === area.id && (
                      <View style={styles.addRow}>
                        <TextInput
                          style={styles.addInputFull}
                          placeholder="I am someone who..."
                          placeholderTextColor={colors.mist2}
                          value={drafts[area.id] || ''}
                          onChangeText={t => setDrafts(prev => ({ ...prev, [area.id]: t }))}
                          onSubmitEditing={() => addStatement(area.id)}
                          returnKeyType="done"
                          autoFocus
                        />
                        <TouchableOpacity onPress={() => addStatement(area.id)} style={styles.addBtn}>
                          <Text style={styles.addBtnText}>✓ Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setAddingTo(null); setDrafts(prev => ({ ...prev, [area.id]: '' })); }} style={styles.addCancelBtn}>
                          <Text style={styles.addCancelBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </GlassCard>
              )}
            </DraggableAreaCard>
          );
        })}
      </View>

      {!addingArea && (
        <TouchableOpacity style={styles.addCustomAreaBtn} onPress={() => setAddingArea(true)}>
          <Text style={styles.addCustomAreaBtnText}>+ Add Custom Area</Text>
        </TouchableOpacity>
      )}

      {saving && <ActivityIndicator color="#c9a8c9" style={{ marginTop: 8 }} />}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── TAB 2 — Portrait ────────────────────────────────────────────────────────
function PortraitTab() {
  const [portrait, setPortrait] = useState('');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [readModalOpen, setReadModalOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    getFutureSelf()
      .then(data => { setPortrait(data.portrait || ''); setDraft(data.portrait || ''); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const handleSave = async () => {
    if (!draft.trim()) { setError('Write your portrait first.'); return; }
    setError(''); setSaving(true);
    try {
      await saveFutureSelf({ portrait: draft.trim() });
      setPortrait(draft.trim());
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  const handleReadAloud = async () => {
    if (playing) {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      setPlaying(false);
      return;
    }
    if (!portrait) return;
    setPlaying(true);
    try {
      const uri = await getItemAudio('portrait', 'portrait_main', portrait, 'luna');
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(s => { if (s.didJustFinish) { setPlaying(false); soundRef.current = null; } });
    } catch (_) { setPlaying(false); }
  };

  if (loading) return <ActivityIndicator color="#c9a8c9" style={{ marginTop: 40 }} />;

  const hasPortrait = !!portrait;

  return (
    <View>
      <Text style={styles.tabIntro}>A written vision of who you already are ✨</Text>

      {(!hasPortrait || editing) ? (
        <GlassCard style={styles.mb16}>
          {editing && (
            <View style={styles.editingBadge}>
              <Text style={styles.editingBadgeText}>Editing portrait</Text>
              <TouchableOpacity onPress={() => { setEditing(false); setDraft(portrait); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          <ExpandableTextArea
            value={draft}
            onChangeText={setDraft}
            placeholder="I am confident, abundant and at peace. I wake up each morning knowing that..."
            modalTitle="Future Self Portrait"
            minHeight={160}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {saved && <Text style={styles.confirmedText}>Saved ✨</Text>}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Portrait ✨</Text>}
          </TouchableOpacity>
        </GlassCard>
      ) : (
        <GlassCard style={styles.mb16}>
          <Text style={styles.portraitText}>{portrait}</Text>
          <View style={styles.portraitActions}>
            <TouchableOpacity style={styles.portraitActionBtn} onPress={() => setEditing(true)}>
              <Text style={styles.portraitActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.portraitActionBtn} onPress={() => setReadModalOpen(true)}>
              <Text style={styles.portraitActionText}>Fullscreen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.portraitActionBtn, playing && styles.portraitActionBtnActive]} onPress={handleReadAloud}>
              <Text style={[styles.portraitActionText, playing && styles.portraitActionTextActive]}>
                {playing ? 'Stop ◼' : 'Read Aloud 🔊'}
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      )}

      <ReadModal
        visible={readModalOpen}
        title="My Portrait"
        body={portrait}
        onClose={() => setReadModalOpen(false)}
      />
    </View>
  );
}

// Entries saved before the short "6 Aug 2026" format existed stored a raw
// new Date().toISOString() string ("2026-04-27T19:00:32.435Z") -- reformat
// anything that still looks like that instead of only formatting new saves,
// so old entries don't keep showing a raw timestamp forever.
function formatBridgeDate(e) {
  if (e.date && !e.date.includes('T')) return e.date;
  const raw = e.date || (e.id ? new Date(e.id) : null);
  const d = raw ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) return e.date || '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Bridge history is rendered inline in the same component that owns the
// actively-typed "I am now.../I am becoming..." ExpandableTextAreas --
// same anti-pattern as Community Wall's feed. Isolated here so typing
// doesn't re-diff every saved history card on each keystroke.
const BridgeHistoryList = memo(function BridgeHistoryList({ history, onEdit, onDelete }) {
  return history.map((e, idx) => {
    const meta = bridgeTopicMeta(e.topic);
    return (
      <GlassCard key={e.id ?? idx} style={styles.mb12}>
        <View style={styles.bridgeEntryHeader}>
          <View style={styles.topicAvatar}>
            <Text style={styles.topicAvatarEmoji}>{meta.emoji}</Text>
          </View>
          <Text style={styles.topicPillText}>{meta.label}</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.bridgeDate}>{formatBridgeDate(e)}</Text>
          <View style={styles.bridgeHeaderActions}>
            <TouchableOpacity onPress={() => onEdit(idx)} style={styles.iconActionBtn} hitSlop={6}>
              <Text style={styles.iconActionBtnText}>✎</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(idx)} style={[styles.iconActionBtn, styles.iconActionBtnDelete]} hitSlop={6}>
              <Text style={styles.iconActionBtnDeleteText}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.bridgeSideLabel}>I am now</Text>
        <Text style={styles.bridgeSideText}>{e.current}</Text>
        <View style={styles.bridgeDivider} />
        <Text style={styles.bridgeSideLabel}>I am becoming</Text>
        <Text style={[styles.bridgeSideText, { fontStyle: 'italic' }]}>{e.future}</Text>
      </GlassCard>
    );
  });
});

// ─── TAB 3 — Bridge ──────────────────────────────────────────────────────────
function BridgeTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState('');
  const [future, setFuture] = useState('');
  const [topic, setTopic] = useState('general');
  const [editIdx, setEditIdx] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getKv('bridge_history')
      .then(raw => { try { setHistory(JSON.parse(raw || '[]')); } catch (_) {} })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const persist = async (next) => {
    await saveKv('bridge_history', JSON.stringify(next));
  };

  const handleSave = async () => {
    if (!current.trim() || !future.trim()) { setError('Fill in both sides.'); return; }
    setError(''); setSaving(true);
    try {
      let next;
      if (editIdx !== null) {
        next = history.map((e, i) => i === editIdx ? { ...e, current: current.trim(), future: future.trim(), topic, edited: true } : e);
        setEditIdx(null);
      } else {
        const entry = { id: Date.now(), current: current.trim(), future: future.trim(), topic, date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) };
        next = [entry, ...history];
      }
      await persist(next);
      setHistory(next);
      setCurrent(''); setFuture(''); setTopic('general');
    } catch (e) { setError(e.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  // useCallback with [history] so BridgeHistoryList's memo() only sees a
  // new reference when the actual history data changes, not on every
  // keystroke in the current/future ExpandableTextAreas above.
  const handleEdit = useCallback((idx) => {
    const e = history[idx];
    setCurrent(e.current); setFuture(e.future); setTopic(e.topic || 'general');
    setEditIdx(idx);
  }, [history]);

  const handleDelete = useCallback((idx) => {
    Alert.alert('Delete this bridge entry?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const next = history.filter((_, i) => i !== idx);
        setHistory(next);
        await persist(next).catch(() => {});
      } },
    ]);
  }, [history]);

  if (loading) return <ActivityIndicator color="#c9a8c9" style={{ marginTop: 40 }} />;

  return (
    <View>
      <Text style={styles.tabIntro}>Bridge who you are now with who you're becoming ✨</Text>

      <GlassCard style={styles.mb16}>
        {editIdx !== null && (
          <View style={styles.editingBadge}>
            <Text style={styles.editingBadgeText}>Editing entry</Text>
            <TouchableOpacity onPress={() => { setEditIdx(null); setCurrent(''); setFuture(''); setTopic('general'); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.bridgeFieldLabel}>I am now...</Text>
        <ExpandableTextArea
          value={current}
          onChangeText={setCurrent}
          placeholder="Be honest. Where I truly am today..."
          modalTitle="I am now"
          minHeight={110}
          style={{ marginBottom: 10 }}
        />
        <Text style={styles.bridgeFieldLabel}>I am becoming...</Text>
        <ExpandableTextArea
          value={future}
          onChangeText={setFuture}
          placeholder="Write as if it is already true. I am..."
          modalTitle="I am becoming"
          minHeight={110}
          style={{ marginBottom: 10 }}
        />
        <Dropdown
          label="Topic"
          value={topic}
          options={BRIDGE_TOPICS.map(t => ({ value: t.value, label: `${t.emoji} ${t.label}` }))}
          onSelect={setTopic}
          fullWidth
        />
        {!!error && <Text style={[styles.errorText, { marginTop: 8 }]}>{error}</Text>}
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{editIdx !== null ? 'Update Moment ✨' : 'Save This Moment ✨'}</Text>}
        </TouchableOpacity>
      </GlassCard>

      {history.length > 0 && (
        <>
          <Text style={styles.sectionHeading}>Your bridge history</Text>
          <BridgeHistoryList history={history} onEdit={handleEdit} onDelete={handleDelete} />
        </>
      )}
    </View>
  );
}

// Saved letters render inline in the same component that owns the
// actively-typed heading/body fields -- identical anti-pattern to
// Community Wall's feed (confirmed by the user's keyboard-glitch report
// on this exact tab). Isolated so a keystroke in the letter body doesn't
// re-diff every saved letter card.
const formatLetterDate = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const SavedLettersList = memo(function SavedLettersList({ letters, expandedId, onToggleExpand, onRead, onEdit, onDelete }) {
  if (letters.length === 0) {
    return <Text style={styles.identityEmptyText}>No letters saved yet ✨</Text>;
  }
  return letters.map(letter => {
    const isOpen = expandedId === letter.id;
    return (
      <GlassCard key={letter.id} style={styles.mb12}>
        <View style={styles.letterHeader}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => onToggleExpand(letter.id)} activeOpacity={0.8}>
            <Text style={styles.letterHeading}>{letter.heading || 'Untitled Letter'}</Text>
          </TouchableOpacity>
          <View style={styles.letterHeaderRight}>
            <View style={styles.letterHeaderActions}>
              <TouchableOpacity onPress={() => onRead({ heading: letter.heading || 'Letter', body: letter.body })} style={styles.iconActionBtn} hitSlop={6}>
                <Text style={styles.iconActionBtnText}>⛶</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onEdit(letter)} style={styles.iconActionBtn} hitSlop={6}>
                <Text style={styles.iconActionBtnText}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(letter.id)} style={[styles.iconActionBtn, styles.iconActionBtnDelete]} hitSlop={6}>
                <Text style={styles.iconActionBtnDeleteText}>🗑</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => onToggleExpand(letter.id)} style={styles.letterDateRow} hitSlop={8}>
              <Text style={styles.letterDate}>{formatLetterDate(letter.ts)}</Text>
              <Text style={styles.accordionChevron}>{isOpen ? '▴' : '▾'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isOpen && <Text style={styles.letterBody}>{letter.body}</Text>}
      </GlassCard>
    );
  });
});

// ─── TAB 4 — Letter ──────────────────────────────────────────────────────────
function LetterTab() {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [editId, setEditId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [readModal, setReadModal] = useState(null); // { heading, body }
  const [activeTopic, setActiveTopic] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    getKv('letters_list')
      .then(raw => { try { setLetters(JSON.parse(raw || '[]')); } catch (_) {} })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const persist = async (next) => {
    await saveKv('letters_list', JSON.stringify(next));
  };

  const handleSave = async () => {
    if (!body.trim()) { setError('Write your letter first.'); return; }
    setError(''); setSaving(true);
    try {
      let next;
      if (editId !== null) {
        next = letters.map(l => l.id === editId ? { ...l, heading: heading.trim(), body: body.trim() } : l);
        setEditId(null);
      } else {
        const letter = { id: Date.now(), heading: heading.trim(), body: body.trim(), ts: Date.now() };
        next = [letter, ...letters].slice(0, 50);
      }
      await persist(next);
      setLetters(next);
      setHeading(''); setBody('');
    } catch (e) { setError(e.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  // useCallback so SavedLettersList's memo() isn't defeated by a fresh
  // function reference on every heading/body keystroke.
  const handleEdit = useCallback((letter) => {
    setHeading(letter.heading || '');
    setBody(letter.body);
    setEditId(letter.id);
  }, []);

  const handleDelete = useCallback((id) => {
    Alert.alert('Delete this letter?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setLetters(prev => {
          const next = prev.filter(l => l.id !== id);
          persist(next).catch(() => {});
          return next;
        });
      } },
    ]);
  }, []);

  const handleToggleExpand = useCallback((id) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const handleReadLetter = useCallback((payload) => setReadModal(payload), []);

  const handleClear = () => { setHeading(''); setBody(''); setActiveTopic(null); setEditId(null); Speech.stop(); setSpeaking(false); };

  const handleSelectTopic = (topic) => { setActiveTopic(topic); setHeading(topic); };

  const handleApplyPrompt = (prompt) => { setBody(prompt.text); };

  const handleReadCompose = () => {
    if (!body.trim()) { setError('Write your letter first.'); return; }
    setReadModal({ heading: heading || 'My Letter', body: body.trim() });
  };

  const handleReadAloudCompose = () => {
    if (speaking) { Speech.stop(); setSpeaking(false); return; }
    if (!body.trim()) return;
    Speech.stop();
    Speech.speak(body.trim(), { rate: 0.9, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false) });
    setSpeaking(true);
  };

  if (loading) return <ActivityIndicator color="#c9a8c9" style={{ marginTop: 40 }} />;

  return (
    <View>
      <Text style={styles.tabIntro}>Letters to and from your future self ✨</Text>

      <Text style={styles.letterPromptsLabel}>WRITING PROMPTS</Text>
      <View style={[styles.chipRowWrap, { marginBottom: 14 }]}>
        {LETTER_PROMPTS.map((p) => (
          <TouchableOpacity key={p.label} style={styles.letterPromptChip} onPress={() => handleApplyPrompt(p)}>
            <Text style={styles.letterPromptChipText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <GlassCard style={styles.mb16}>
        {editId !== null && (
          <View style={styles.editingBadge}>
            <Text style={styles.editingBadgeText}>Editing letter</Text>
            <TouchableOpacity onPress={() => { setEditId(null); setHeading(''); setBody(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.letterTopicLabel}>CHOOSE A TOPIC</Text>
        <View style={styles.chipRowWrap}>
          {LETTER_TOPICS.map((t) => (
            <TouchableOpacity key={t} style={[styles.letterTopicChip, activeTopic === t && styles.letterTopicChipActive]} onPress={() => handleSelectTopic(t)}>
              <Text style={[styles.letterTopicChipText, activeTopic === t && styles.letterTopicChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { marginBottom: 10, marginTop: 10 }]}
          placeholder="Add your own heading (optional)..."
          placeholderTextColor="#9a8896"
          value={heading}
          onChangeText={setHeading}
        />
        <ExpandableTextArea
          value={body}
          onChangeText={setBody}
          placeholder="Dear present self, I'm writing to you from the life you always dreamed of..."
          modalTitle="Letter"
          minHeight={200}
        />
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <View style={styles.letterActionsRow}>
          <TouchableOpacity style={styles.primaryBtnSm} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnSmText}>💾 {editId !== null ? 'Update Letter' : 'Save Letter'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallActionBtn} onPress={handleReadCompose}><Text style={styles.smallActionBtnText}>📖 Read</Text></TouchableOpacity>
          <TouchableOpacity style={styles.smallActionBtn} onPress={handleReadAloudCompose}><Text style={styles.smallActionBtnText}>{speaking ? '⏹ Stop' : '🔊 Read Aloud'}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.smallActionBtn} onPress={handleClear}><Text style={styles.smallActionBtnText}>🗑️ Clear</Text></TouchableOpacity>
        </View>
      </GlassCard>

      <Text style={[styles.sectionHeading, { marginTop: 4 }]}>💌 Saved Letters</Text>
      <SavedLettersList
        letters={letters}
        expandedId={expandedId}
        onToggleExpand={handleToggleExpand}
        onRead={handleReadLetter}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {readModal && (
        <ReadModal
          visible={!!readModal}
          title={readModal.heading}
          body={readModal.body}
          onClose={() => setReadModal(null)}
        />
      )}
    </View>
  );
}

// ─── TAB 5 — Actions ─────────────────────────────────────────────────────────
function ActionsTab() {
  const [category, setCategory] = useState('general');
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(true);

  const storageKey = `mv_fs_actions_${todayISO()}`;

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then(raw => { if (raw) { try { setChecked(JSON.parse(raw)); } catch (_) {} } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (cat, idx) => {
    const key = `${cat}_${idx}`;
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
  };

  const actions = FS_ACTIONS[category] || [];
  const done = actions.filter((_, i) => !!checked[`${category}_${i}`]).length;

  if (loading) return <ActivityIndicator color="#c9a8c9" style={{ marginTop: 40 }} />;

  return (
    <View>
      <Text style={styles.tabIntro}>Daily actions to embody your future self ✨</Text>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll} contentContainerStyle={styles.pillsContent}>
        {ACTION_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.pill, category === cat && styles.pillActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Progress */}
      <GlassCard style={styles.mb16}>
        <View style={styles.actionProgressLabelRow}>
          <Text style={styles.actionProgressLabel}>Today's progress</Text>
          <Text style={styles.actionProgressCount}>{done} / {actions.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(done / actions.length) * 100}%` }]} />
        </View>
        {done === actions.length && (
          <Text style={styles.completionMsg}>You're living as your future self today 🌱</Text>
        )}
      </GlassCard>

      {/* Checklist */}
      <GlassCard>
        {actions.map((action, i) => {
          const key = `${category}_${i}`;
          const isChecked = !!checked[key];
          return (
            <TouchableOpacity
              key={i}
              style={[styles.actionRow, i < actions.length - 1 && styles.actionRowDivider]}
              onPress={() => toggle(category, i)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                {isChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.actionText, isChecked && styles.actionTextChecked]}>{action}</Text>
            </TouchableOpacity>
          );
        })}
      </GlassCard>
    </View>
  );
}

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'identity', label: 'Identity' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'bridge',   label: 'Bridge' },
  { id: 'letter',   label: 'Letter' },
  { id: 'actions',  label: 'Actions' },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FutureSelf() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('identity');

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 46 }]} keyboardShouldPersistTaps="handled">

        <ScreenHeader lead="Future" accent="Self" subtitle="Identity, portrait, bridge & letters from who you're becoming" />

        <TabPill
          options={TABS.map(t => ({ value: t.id, label: t.label }))}
          value={tab}
          onChange={setTab}
          style={styles.tabScrollWrap}
        />

        {/* Tab content */}
        {tab === 'identity' && <IdentityTab />}
        {tab === 'portrait' && <PortraitTab />}
        {tab === 'bridge'   && <BridgeTab />}
        {tab === 'letter'   && <LetterTab />}
        {tab === 'actions'  && <ActionsTab />}

      </ScrollView>
    </GradientBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },

  screenTitle: { fontSize: 26, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  titleAccent: { color: '#9a5fa8', fontStyle: 'italic' },
  screenSubtitle: { fontSize: 13, color: '#6b5c66', fontWeight: '500', marginBottom: 16 },

  tabScrollWrap: { marginBottom: 20 },

  tabIntro: { fontSize: 13, color: '#6b5c66', fontWeight: '500', marginBottom: 16, textAlign: 'center' },

  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2e2530',
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
  },
  errorText: { color: '#c04040', fontSize: 13, textAlign: 'center', marginTop: 4 },
  confirmedText: { color: '#7da888', fontSize: 13, textAlign: 'center', fontWeight: '600', marginTop: 4 },

  primaryBtn: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  sectionHeading: {
    fontSize: 11, color: '#9a5fa8', fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
  },

  editingBadge: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.15)',
  },
  editingBadgeText: { fontSize: 12, color: '#9a5fa8', fontWeight: '600', letterSpacing: 0.4 },
  cancelText: { fontSize: 12, color: '#9a8896', fontWeight: '500' },

  // Identity — in-place drag to reorder
  reorderHintInline: { fontSize: 12, color: '#9a8896', textAlign: 'center', marginTop: -10, marginBottom: 14, fontStyle: 'italic' },
  draggableAreaWrap: { left: 0, right: 0 },
  dragHandleWrap: { paddingRight: 4 },
  dragHandleIcon: { fontSize: 15, color: '#c9a8c9' },

  // Identity accordion
  accordionHeader: { flexDirection: 'row', alignItems: 'center' },
  accordionIcon: { fontSize: 19, marginRight: 10 },
  accordionLabel: { flex: 1, fontSize: 14.5, fontFamily: fonts.bodyMedium, fontWeight: '600', color: colors.ink },
  accordionBadge: {
    backgroundColor: 'rgba(200,88,120,0.16)', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, marginRight: 8,
  },
  accordionBadgeText: { fontSize: 11, color: colors.pinkDeep, fontFamily: fonts.bodyBold, fontWeight: '700' },
  accordionChevron: { fontSize: 12, color: colors.mist2 },
  accordionBody: { marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(154,95,168,0.1)', paddingTop: 12 },
  // Soft-tinted rows instead of boxed/bordered rectangles: a frosted
  // white-glass wash (not pink -- too much colour on top of the header's
  // own tint read as busy), generous rounded padding, and a thin colour
  // accent bar on the left rather than a hard outline.
  stmtRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radii.sm,
    paddingVertical: 13, paddingHorizontal: 14,
    marginBottom: 8,
  },
  stmtAccentBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.pinkDark, marginRight: 12 },
  stmtText: { color: colors.ink2, fontSize: 16.5, fontFamily: fonts.displayItalic, fontStyle: 'italic', flex: 1, lineHeight: 23 },
  stmtRemove: { color: colors.mist, fontSize: 13, paddingHorizontal: 4, marginLeft: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  addPrefix: { fontSize: 13, color: '#6b5c66', fontStyle: 'italic' },
  addInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#2e2530',
    borderWidth: 1, borderColor: 'rgba(201,168,201,0.2)',
  },
  addBtn: {
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(200,88,120,0.16)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,88,120,0.3)',
  },
  addBtnText: { color: colors.pinkDeep, fontWeight: '600', fontSize: 13 },
  addCancelBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  addCancelBtnText: { color: colors.mist2, fontSize: 14, fontWeight: '600' },
  addInputFull: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#2e2530', fontStyle: 'italic',
    borderWidth: 1, borderColor: 'rgba(200,88,120,0.35)',
  },

  // Identity — always-open panels styled to read as cohesive frosted
  // cards (GlassCard) rather than a cramped flat list: a frosted-glass
  // header (not a solid pink wash -- combined with the pink-tinted rows
  // below it, that read as too colourful/busy) with rounded top corners,
  // real breathing room between panels.
  identityBlock: { marginBottom: spacing.xl },
  identityBlockHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,201,0.18)',
    borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg,
  },
  identityAddPill: { backgroundColor: 'rgba(200,88,120,0.16)', borderWidth: 1, borderColor: 'rgba(200,88,120,0.3)', borderRadius: 50, paddingVertical: 5, paddingHorizontal: 12 },
  identityAddPillText: { fontSize: 11.5, color: colors.pinkDeep, fontWeight: '700' },
  identityRemoveBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder, alignItems: 'center', justifyContent: 'center' },
  identityRemoveBtnText: { fontSize: 11, color: colors.danger },
  identityBlockBody: { padding: 16 },
  identityEmptyText: { fontSize: 12.5, color: colors.mist2, fontStyle: 'italic' },

  // Add custom life area
  newAreaBox: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(200,88,120,0.35)', borderStyle: 'dashed', borderRadius: 14, padding: 12, marginBottom: 16 },
  newAreaLabel: { fontSize: 10.5, color: colors.pinkDeep, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  newAreaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  newAreaIcInput: { width: 42, textAlign: 'center', backgroundColor: '#fafafa', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,88,120,0.3)', paddingVertical: 8, fontSize: 15 },
  newAreaNameInput: { flex: 1, backgroundColor: '#fafafa', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,88,120,0.3)', paddingVertical: 8, paddingHorizontal: 10, fontSize: 13, color: '#2e2530' },
  newAreaAddBtn: { backgroundColor: colors.pinkDeep, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  newAreaAddBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
  newAreaCancelText: { fontSize: 16, color: colors.mist2, paddingHorizontal: 4 },
  addCustomAreaBtn: { alignSelf: 'center', marginTop: 4, marginBottom: 8 },
  addCustomAreaBtnText: { fontSize: 13, color: colors.pinkDeep, fontWeight: '600' },

  // Portrait
  portraitText: { color: '#2e2530', fontSize: 15, fontStyle: 'italic', lineHeight: 24, marginBottom: 16 },
  portraitActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  portraitActionBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.2)',
  },
  portraitActionBtnActive: { backgroundColor: 'rgba(201,168,201,0.3)', borderColor: '#c9a8c9' },
  portraitActionText: { fontSize: 12, color: '#9a5fa8', fontWeight: '600' },
  portraitActionTextActive: { color: '#7a3f88' },

  // Bridge
  bridgeFieldLabel: { fontSize: 12, color: '#9a5fa8', fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  bridgeEntryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  topicPill: {
    backgroundColor: 'rgba(201,168,201,0.2)', borderRadius: 10,
    paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(154,95,168,0.2)',
  },
  topicPillText: { fontSize: 12.5, color: '#2e2530', fontWeight: '600' },
  topicAvatar: {
    width: 28, height: 28, borderRadius: 14, marginRight: 8,
    backgroundColor: 'rgba(201,168,201,0.22)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  topicAvatarEmoji: { fontSize: 14 },
  bridgeDate: { fontSize: 11, color: '#9a8896', marginRight: 10 },
  bridgeHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bridgeSideLabel: { fontSize: 10, color: '#9a5fa8', fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  bridgeSideText: { color: '#2e2530', fontSize: 13, lineHeight: 19, marginBottom: 8 },
  bridgeDivider: { height: 1, backgroundColor: 'rgba(154,95,168,0.1)', marginVertical: 8 },

  // Letters
  letterHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  letterHeaderRight: { alignItems: 'flex-end', gap: 8 },
  letterHeaderActions: { flexDirection: 'row', gap: 6 },
  letterDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  letterHeading: { fontSize: 17, fontFamily: fonts.displayMedium, color: colors.ink, marginBottom: 3 },
  letterDate: { fontSize: 11.5, color: colors.mist2 },
  letterPreview: { color: colors.mist, fontSize: 14, lineHeight: 20 },
  letterBody: { color: colors.ink2, fontSize: 16, lineHeight: 24, fontFamily: fonts.displayItalic, fontStyle: 'italic', marginVertical: 12 },

  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  letterPromptsLabel: { fontSize: 10.5, color: '#9a5fa8', fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  letterPromptChip: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderRadius: 50, paddingVertical: 7, paddingHorizontal: 13 },
  letterPromptChipText: { fontSize: 12, color: '#9a5fa8', fontWeight: '600' },
  letterTopicLabel: { fontSize: 10.5, color: '#9a5fa8', fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  letterTopicChip: { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderRadius: 50, paddingVertical: 5, paddingHorizontal: 11 },
  letterTopicChipActive: { backgroundColor: '#9a5fa8', borderColor: '#9a5fa8' },
  letterTopicChipText: { fontSize: 11, color: '#9a5fa8' },
  letterTopicChipTextActive: { color: '#fff', fontWeight: '600' },
  letterActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' },
  primaryBtnSm: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  primaryBtnSmText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },

  // Entry action row (edit/delete)
  entryActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallActionBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.2)',
  },
  smallActionBtnText: { fontSize: 11, color: '#9a5fa8', fontWeight: '600' },
  smallActionBtnDelete: { borderColor: 'rgba(192,64,64,0.2)' },
  smallActionBtnDeleteText: { fontSize: 11, color: '#9a8896', fontWeight: '600' },

  // Small icon-only action buttons, used top-right of Bridge/Letter cards
  iconActionBtn: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.2)',
  },
  iconActionBtnText: { fontSize: 12.5, color: '#9a5fa8' },
  iconActionBtnDelete: { borderColor: 'rgba(192,64,64,0.25)' },
  iconActionBtnDeleteText: { fontSize: 12, color: '#c04040' },

  // Actions tab
  pillsScroll: { marginBottom: 16 },
  pillsContent: { gap: 8, paddingRight: 4 },
  pill: {
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.2)',
  },
  pillActive: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#6b5c66' },
  pillTextActive: { color: '#fff' },

  actionProgressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  actionProgressLabel: { fontSize: 11, color: '#9a5fa8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  actionProgressCount: { fontSize: 11, color: '#6b5c66', fontWeight: '500' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(201,168,201,0.25)', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#c9a8c9' },
  completionMsg: { fontSize: 13, color: '#7da888', fontWeight: '600', textAlign: 'center', marginTop: 10 },

  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  actionRowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.08)' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: 'rgba(154,95,168,0.3)', justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionText: { color: '#2e2530', fontSize: 13, flex: 1, lineHeight: 19 },
  actionTextChecked: { color: '#9a8896', textDecorationLine: 'line-through' },

  // Read modal
  readModalScroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  readModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  readModalTitle: { fontSize: 18, fontWeight: '600', color: '#2e2530', flex: 1 },
  readModalClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(154,95,168,0.2)',
  },
  readModalCloseText: { fontSize: 14, color: '#6b5c66', fontWeight: '600' },
  readModalBody: { color: '#2e2530', fontSize: 15, fontStyle: 'italic', lineHeight: 26 },
}); 