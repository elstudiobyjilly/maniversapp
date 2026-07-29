import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import {
  generateFeelIt,
  saveFeelItCard,
  getFeelItCards,
  updateFeelItCard,
  deleteFeelItCard,
  createCheckout,
} from '../../services/api';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import TabPill from '../../components/TabPill';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii } from '../../constants/theme';
import * as Linking from 'expo-linking';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - 64;

// ─── Spotlight Modal ────────────────────────────────────────────────────────
function SpotlightModal({ card, visible, onClose, onToggleFav, onDelete }) {
  if (!card) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.spotlightScroll}>
          {/* Header row */}
          <View style={styles.spotlightHeader}>
            <TouchableOpacity onPress={onClose} style={styles.spotlightClose}>
              <Text style={styles.spotlightCloseText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onToggleFav(card)} style={styles.spotlightFav}>
              <Text style={styles.favIcon}>{card.is_favourite ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          </View>

          <GlassCard style={styles.spotlightCard}>
            <Text style={styles.spotlightState}>{card.state}</Text>

            <Text style={styles.sectionLabel}>What's happening</Text>
            <Text style={styles.bodyText}>{card.what}</Text>

            {Array.isArray(card.how_to) && card.how_to.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>How to shift it</Text>
                {card.how_to.map((line, i) => (
                  <Text key={i} style={styles.listItem}>• {line}</Text>
                ))}
              </>
            )}

            {Array.isArray(card.body_scan) && card.body_scan.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Body scan</Text>
                {card.body_scan.map((line, i) => (
                  <Text key={i} style={styles.listItem}>• {line}</Text>
                ))}
              </>
            )}

            {!!card.anchor && (
              <>
                <Text style={styles.sectionLabel}>Anchor</Text>
                <Text style={styles.bodyText}>{card.anchor}</Text>
              </>
            )}

            {!!card.script && (
              <>
                <Text style={styles.sectionLabel}>Script</Text>
                <Text style={styles.scriptText}>{card.script}</Text>
              </>
            )}

            <TouchableOpacity
              onPress={() => { onDelete(card.id); onClose(); }}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteBtnText}>Release this card 🕊️</Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      </GradientBackground>
    </Modal>
  );
}

// ─── Draggable Stack Item ────────────────────────────────────────────────────
function StackCard({ card, index, total, onTap, onDragEnd }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);
  const startY = useRef(0);

  // Visual offset for stacking effect — cards below are shifted down/scaled down
  const depthOffset = (total - 1 - index) * 10;
  const depthScale = 1 - (total - 1 - index) * 0.035;
  const depthOpacity = 1 - (total - 1 - index) * 0.12;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 6,
      onPanResponderGrant: (_, gs) => {
        isDragging.current = false;
        startY.current = gs.y0;
        pan.setOffset({ x: 0, y: 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dy) > 8) isDragging.current = true;
        pan.setValue({ x: 0, y: gs.dy });
      },
      onPanResponderRelease: (_, gs) => {
        pan.flattenOffset();
        if (!isDragging.current) {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
          onTap();
          return;
        }
        onDragEnd(index, gs.dy);
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.stackCardWrap,
        {
          bottom: depthOffset,
          transform: [
            { translateY: pan.y },
            { scale: depthScale },
          ],
          opacity: depthOpacity,
          zIndex: index,
        },
      ]}
    >
      <GlassCard style={styles.stackCardInner}>
        <View style={styles.stackCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.stackState}>{card.state}</Text>
            {card.locked ? <Text style={{ fontSize: 11 }}>🔒</Text> : null}
          </View>
          <Text style={styles.favIconSmall}>{card.is_favourite ? '⭐' : ''}</Text>
        </View>
        <Text style={styles.stackWhat} numberOfLines={2}>{card.what}</Text>
        {!!card.script && (
          <Text style={styles.stackScript} numberOfLines={2}>{card.script}</Text>
        )}
        <Text style={styles.stackHint}>Tap to open · hold & drag to reorder</Text>
      </GlassCard>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function FeelIt() {
  const { limits, refresh } = usePlanStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  const [tab, setTab] = useState('generate');

  // Generate tab state
  const [stateInput, setStateInput] = useState('');
  const [card, setCard] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Library tab state
  const [myCards, setMyCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);

  // Spotlight modal
  const [spotlight, setSpotlight] = useState(null);

  const loadCards = async () => {
    try {
      const data = await getFeelItCards();
      // Sort by display_order asc
      const sorted = [...data].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setMyCards(sorted);
    } catch (_) {}
  };

  useEffect(() => { refresh(); loadCards().finally(() => setLoadingCards(false)); }, []);

  const handleGenerate = async () => {
    if (!stateInput.trim()) { setError("Tell me how you're feeling."); return; }
    setError(''); setGenerating(true); setSaved(false); setCard(null);
    try {
      const result = await generateFeelIt(stateInput.trim());
      setCard(result);
    } catch (e) {
      setError(e.message || 'Could not generate');
    } finally { setGenerating(false); }
  };

  const handleSaveCard = async () => {
    if (!card) return;
    const cap = limits?.feelit_cards_total;
    if (cap != null && myCards.length >= cap) {
      setUpgradeMsg(`You've reached your ${cap} free Feel It cards -- upgrade for more room.`);
      setShowUpgrade(true);
      return;
    }
    setSaving(true); setError('');
    try {
      const savedCard = await saveFeelItCard({
        state: card.state,
        what: card.what,
        how_to: card.how_to,
        body_scan: card.body_scan,
        anchor: card.anchor,
        script: card.script,
      });
      setMyCards((prev) => [savedCard, ...prev]);
      setSaved(true);
    } catch (e) {
      if (e.status === 403) { setUpgradeMsg(e.message || 'Upgrade for more Feel It cards.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not save card');
    } finally { setSaving(false); }
  };

  const handleToggleFavourite = async (c) => {
    const next = !c.is_favourite;
    setMyCards((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_favourite: next } : x)));
    if (spotlight?.id === c.id) setSpotlight((s) => s ? { ...s, is_favourite: next } : s);
    try { await updateFeelItCard(c.id, { is_favourite: next }); } catch (_) {}
  };

  const handleDeleteCard = async (id) => {
    try {
      await deleteFeelItCard(id);
      setMyCards((prev) => prev.filter((c) => c.id !== id));
    } catch (e) { setError(e.message || 'Could not delete'); }
  };

  // Drag reorder: positive dy = dragged down, negative = dragged up
  const handleDragEnd = useCallback((fromIndex, dy) => {
    const CARD_HEIGHT = 160; // approximate card height
    const steps = Math.round(dy / CARD_HEIGHT);
    if (steps === 0) return;
    const toIndex = Math.max(0, Math.min(myCards.length - 1, fromIndex + steps));
    if (toIndex === fromIndex) return;

    setMyCards((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      // Persist new display_order for every card
      next.forEach((c, i) => {
        updateFeelItCard(c.id, { display_order: i }).catch(() => {});
      });
      return next;
    });
  }, [myCards]);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>

        <ScreenHeader lead="Feel It" accent="Cards" subtitle="Transmute your emotional state ✨" />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'generate', label: 'Feeling' },
            { value: 'library', label: 'My Feel Cards' },
          ]}
        />

        {/* ── GENERATE TAB ── */}
        {tab === 'generate' ? (
          <>
            <GlassCard style={styles.mb16}>
              <Text style={styles.cardTitle}>How are you feeling right now?</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. anxious, stuck, overwhelmed, doubtful..."
                placeholderTextColor="#9a8896"
                value={stateInput}
                onChangeText={setStateInput}
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              <Button title="Feel Into It ✨" onPress={handleGenerate} loading={generating} fullWidth style={{ marginTop: 12 }} />
            </GlassCard>

            {card && (
              <GlassCard style={styles.mb16}>
                <Text style={styles.generatedState}>{card.state}</Text>

                <Text style={styles.sectionLabel}>What's happening</Text>
                <Text style={styles.bodyText}>{card.what}</Text>

                {Array.isArray(card.how_to) && card.how_to.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>How to shift it</Text>
                    {card.how_to.map((line, i) => (
                      <Text key={i} style={styles.listItem}>• {line}</Text>
                    ))}
                  </>
                )}

                {Array.isArray(card.body_scan) && card.body_scan.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Body scan</Text>
                    {card.body_scan.map((line, i) => (
                      <Text key={i} style={styles.listItem}>• {line}</Text>
                    ))}
                  </>
                )}

                {!!card.anchor && (
                  <>
                    <Text style={styles.sectionLabel}>Anchor</Text>
                    <Text style={styles.bodyText}>{card.anchor}</Text>
                  </>
                )}

                {!!card.script && (
                  <>
                    <Text style={styles.sectionLabel}>Script</Text>
                    <Text style={styles.scriptText}>{card.script}</Text>
                  </>
                )}

                <Button title={saved ? 'Saved ✨' : 'Save to My Feel Cards'} variant="ghost" onPress={handleSaveCard} loading={saving} fullWidth style={{ marginTop: 12 }} />
              </GlassCard>
            )}
          </>
        ) : (
          /* ── LIBRARY TAB ── */
          loadingCards ? (
            <ActivityIndicator color="#c9a8c9" style={{ marginTop: 40 }} />
          ) : myCards.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🃏</Text>
              <Text style={styles.emptyTitle}>No saved Feel Cards yet</Text>
              <Text style={styles.emptySubtitle}>Generate your first one ✨</Text>
            </GlassCard>
          ) : (
            /* Card Stack */
            <View style={[styles.stackContainer, { height: 180 + (myCards.length - 1) * 10 + 40 }]}>
              {/* Render bottom-first so top card is last (highest z-index) */}
              {[...myCards].reverse().map((c, reversedIdx) => {
                const realIndex = myCards.length - 1 - reversedIdx;
                return (
                  <StackCard
                    key={c.id}
                    card={c}
                    index={realIndex}
                    total={myCards.length}
                    onTap={() => c.locked ? (setUpgradeMsg('This card is locked -- upgrade to view it again.'), setShowUpgrade(true)) : setSpotlight(c)}
                    onDragEnd={handleDragEnd}
                  />
                );
              })}
            </View>
          )
        )}

      </ScrollView>

      {/* Spotlight fullscreen modal */}
      <SpotlightModal
        card={spotlight}
        visible={!!spotlight}
        onClose={() => setSpotlight(null)}
        onToggleFav={handleToggleFavourite}
        onDelete={handleDeleteCard}
      />

      <UpgradeModal
        visible={showUpgrade}
        message={upgradeMsg}
        onClose={() => setShowUpgrade(false)}
        onSelectPlan={async (priceKey) => {
          try { const res = await createCheckout(priceKey); if (res?.url) await Linking.openURL(res.url); }
          catch (_) {}
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },

  mb16: { marginBottom: 16 },

  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 12 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2e2530',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
  },
  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },

  generatedState: { fontSize: 18, fontWeight: '600', color: '#2e2530', textTransform: 'capitalize', marginBottom: 8 },
  sectionLabel: {
    fontSize: 11,
    color: '#9a5fa8',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  bodyText: { color: '#2e2530', fontSize: 14, lineHeight: 20 },
  listItem: { color: '#2e2530', fontSize: 14, lineHeight: 20, marginLeft: 4 },
  scriptText: { color: '#2e2530', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },

  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: 36 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#2e2530', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#6b5c66' },

  // Stack
  stackContainer: {
    alignItems: 'center',
    marginTop: 16,
    position: 'relative',
  },
  stackCardWrap: {
    position: 'absolute',
    width: CARD_W,
    left: (SCREEN_W - 64 - CARD_W) / 2 + 12,
  },
  stackCardInner: {
    width: CARD_W,
  },
  stackCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  stackState: { fontSize: 17, fontWeight: '600', color: '#2e2530', textTransform: 'capitalize', flex: 1 },
  favIconSmall: { fontSize: 16, marginLeft: 6 },
  stackWhat: { color: '#6b5c66', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  stackScript: { color: '#2e2530', fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  stackHint: { fontSize: 10, color: '#9a8896', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },

  // Spotlight Modal
  spotlightScroll: { padding: 20, paddingTop: 20, paddingBottom: 60 },
  spotlightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  spotlightClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.2)',
  },
  spotlightCloseText: { fontSize: 14, color: '#6b5c66', fontWeight: '600' },
  spotlightFav: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.2)',
  },
  favIcon: { fontSize: 18 },
  spotlightCard: {},
  spotlightState: { fontSize: 22, fontWeight: '600', color: '#2e2530', textTransform: 'capitalize', marginBottom: 12 },
  deleteBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(192,64,64,0.3)',
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#c04040', fontSize: 14, fontWeight: '500' },
});