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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Speech from 'expo-speech';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ExpandableTextArea from '../../components/ExpandableTextArea';
import {
  saveFeelItCard,
  getFeelItCards,
  updateFeelItCard,
  deleteFeelItCard,
  createCheckout,
} from '../../services/api';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii } from '../../constants/theme';
import * as Linking from 'expo-linking';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Ported exactly from the website's COLOR_PALETTE (fixes.js) — each card
// picks one of these, light cards get dark ink text, dark cards get light
// ink text. Trimmed the 2-stop gradient out of each CSS linear-gradient().
const FEEL_COLOR_PALETTE = [
  { key: 'cloud', colors: ['#fafbff', '#f2f0ff'] },
  { key: 'butter', colors: ['#fefef5', '#fdf8e0'] },
  { key: 'icy', colors: ['#f0fbff', '#e0f4ff'] },
  { key: 'milk', colors: ['#fefcf8', '#faf5ec'] },
  { key: 'petal', colors: ['#fff8fb', '#fdeef8'] },
  { key: 'pink', colors: ['#fdf0f8', '#f0e4ff'] },
  { key: 'lavender', colors: ['#f4f0ff', '#ebe4ff'] },
  { key: 'blue', colors: ['#f0f4ff', '#e4eeff'] },
  { key: 'rose', colors: ['#fff0f6', '#fde0ee'] },
  { key: 'mint', colors: ['#f0fff6', '#d8f5e8'] },
  { key: 'lemon', colors: ['#fffbf0', '#fff0c8'] },
  { key: 'peach', colors: ['#fff4f0', '#ffe0d8'] },
  { key: 'teal', colors: ['#f0fffd', '#d8f5f5'] },
  { key: 'sky', colors: ['#e8f4ff', '#cce8ff'] },
  { key: 'sage', colors: ['#f0f8f2', '#d4ecda'] },
  { key: 'blush', colors: ['#fff0ee', '#ffd8d4'] },
  { key: 'lilac', colors: ['#f8f0ff', '#ead8ff'] },
  { key: 'aqua', colors: ['#edfffe', '#c8f5f0'] },
  { key: 'dusk', colors: ['#fdf0ff', '#e8d0f8'] },
  { key: 'gold', colors: ['#fffaee', '#ffedb8'] },
  { key: 'mauve', colors: ['#faeeff', '#e4c8f0'] },
  { key: 'coral', colors: ['#fff3ee', '#ffd8c8'] },
  { key: 'plum', colors: ['#f8eeff', '#e8ccff'] },
  { key: 'cherry', colors: ['#ffb4c8', '#ffd0dc'] },
  { key: 'violet', colors: ['#c8b4ff', '#e0d0ff'] },
  { key: 'storm', colors: ['#b4c8e0', '#c8d8f0'] },
  { key: 'moss', colors: ['#b4d4b4', '#cce8cc'] },
  { key: 'sunset', colors: ['#ffb4a0', '#ffd0b0'] },
  { key: 'citrus', colors: ['#ffe066', '#fff099'] },
  { key: 'sand', colors: ['#ede0cc', '#f5ecdc'] },
  { key: 'truffle', colors: ['#d4c0a8', '#e0cebb'] },
  { key: 'linen', colors: ['#f0e8dc', '#e8ddd0'] },
  { key: 'clay', colors: ['#d4b8a8', '#c8a898'] },
  { key: 'parchment', colors: ['#e8dcc8', '#dfd0b8'] },
  { key: 'midnight', colors: ['#1a1030', '#2a1848'], dark: true },
  { key: 'ocean', colors: ['#0a1828', '#0d2840'], dark: true },
  { key: 'forest', colors: ['#0f2016', '#1a3a22'], dark: true },
  { key: 'slate', colors: ['#1a1e28', '#222840'], dark: true },
  { key: 'wine', colors: ['#2a0a18', '#3a1028'], dark: true },
  { key: 'ember', colors: ['#2a0a00', '#3a1800'], dark: true },
  { key: 'espresso', colors: ['#1e1008', '#2e1c10'], dark: true },
  { key: 'abyss', colors: ['#060610', '#0e0e24'], dark: true },
  { key: 'noir', colors: ['#0e0e0e', '#1c1c1c'], dark: true },
];

function paletteFor(card, index) {
  if (card?.color) {
    const f = FEEL_COLOR_PALETTE.find((c) => c.key === card.color);
    if (f) return f;
  }
  return FEEL_COLOR_PALETTE[index % FEEL_COLOR_PALETTE.length];
}

function cardTextColors(pal) {
  return pal.dark
    ? { ink: '#f0e4ff', accent: 'rgba(220,180,255,.9)', border: 'rgba(220,180,255,.5)' }
    : { ink: colors.ink, accent: colors.purpleDark, border: 'rgba(232,152,184,.55)' };
}

// ─── Grid card — small colored tile with a neon-glass border, matches the
// website's mv-feel-grid-card.
function FeelGridCard({ card, index, onOpen, onEdit, onDelete }) {
  const pal = paletteFor(card, index);
  const tc = cardTextColors(pal);
  const hasText = card.what && card.what.trim();
  return (
    <TouchableOpacity style={styles.gridCardWrap} onPress={onOpen} activeOpacity={0.85}>
      <LinearGradient colors={pal.colors} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={[styles.gridCard, { borderColor: tc.border, shadowColor: tc.border }]}>
        <View style={styles.gridCardActions}>
          <TouchableOpacity style={styles.gridIconBtn} onPress={onEdit} hitSlop={6}><Text style={styles.gridIconText}>✏️</Text></TouchableOpacity>
          <TouchableOpacity style={styles.gridIconBtn} onPress={onDelete} hitSlop={6}><Text style={styles.gridIconText}>🗑️</Text></TouchableOpacity>
        </View>
        <Text style={[styles.gridCardTitle, { color: tc.accent }]} numberOfLines={1}>✨ {card.state || 'Untitled'}</Text>
        <Text style={[styles.gridCardPreview, { color: tc.ink }]} numberOfLines={4}>
          {hasText ? card.what : 'Tap to write…'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Full-screen swipeable reader — matches the website's mv-feel-fs-ov.
// The card itself (not the whole screen) is the thing that swipes: drag it
// horizontally, release past the threshold and it flies off-screen revealing
// the next/prev card, or it snaps back to center if the drag wasn't far
// enough -- matching a standard swipeable-card-deck.
const SWIPE_THRESHOLD = SCREEN_W * 0.28;

function FeelFullScreen({ cards, index, onIndexChange, onClose, onEdit, onDelete, onAdd }) {
  const card = cards[index];
  const [speaking, setSpeaking] = useState(false);
  const pal = card ? paletteFor(card, index) : FEEL_COLOR_PALETTE[0];
  const tc = cardTextColors(pal);

  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  const goNext = useCallback(() => onIndexChange((index + 1) % cards.length), [index, cards.length, onIndexChange]);
  const goPrev = useCallback(() => onIndexChange((index - 1 + cards.length) % cards.length), [index, cards.length, onIndexChange]);

  const settleAndAdvance = useCallback((direction) => {
    // direction: 1 = swiped left (go next), -1 = swiped right (go prev)
    if (direction > 0) goNext(); else goPrev();
    translateX.value = 0;
    cardOpacity.value = 1;
  }, [goNext, goPrev, translateX, cardOpacity]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-18, 18])
    .onUpdate((e) => { translateX.value = e.translationX; })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_W, { duration: 220 }, () => runOnJS(settleAndAdvance)(1));
        cardOpacity.value = withTiming(0, { duration: 220 });
      } else if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_W, { duration: 220 }, () => runOnJS(settleAndAdvance)(-1));
        cardOpacity.value = withTiming(0, { duration: 220 });
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${translateX.value / 22}deg` },
    ],
    opacity: cardOpacity.value,
  }));

  useEffect(() => { Speech.stop(); setSpeaking(false); }, [index]);
  // Reset the drag position whenever the underlying card changes (e.g. via
  // the pager dots) so a leftover translateX doesn't carry into the new card.
  useEffect(() => { translateX.value = 0; cardOpacity.value = 1; }, [index]);

  if (!card) return null;

  const handleListen = () => {
    if (speaking) { Speech.stop(); setSpeaking(false); return; }
    Speech.stop();
    Speech.speak(card.what || '', { rate: 0.9, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false) });
    setSpeaking(true);
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.fsRoot}>
        <View style={styles.fsNav}>
          <TouchableOpacity onPress={onClose} hitSlop={8}><Text style={styles.fsCloseIcon}>✕</Text></TouchableOpacity>
          <Text style={styles.fsCounter}>{index + 1} of {cards.length}</Text>
          <TouchableOpacity style={styles.fsNavBtn} onPress={onEdit}><Text style={styles.fsNavBtnText}>✏️ Edit</Text></TouchableOpacity>
        </View>

        <View style={styles.fsCardArea}>
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.fsCardAnimatedWrap, cardAnimatedStyle]}>
              <LinearGradient colors={pal.colors} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={[styles.fsCard, { borderColor: tc.border }]}>
                {/* Heading pinned to the top of the CARD itself. */}
                <Text style={[styles.fsDesire, { color: tc.accent }]}>✨ {card.state}</Text>
                {/* Body vertically centered within the remaining card space. */}
                <View style={styles.fsBody}>
                  <ScrollView contentContainerStyle={styles.fsBodyScroll} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.fsText, { color: tc.ink }]}>
                      {card.what && card.what.trim() ? card.what : 'Tap Edit to write how this feels…'}
                    </Text>
                  </ScrollView>
                </View>
              </LinearGradient>
            </Animated.View>
          </GestureDetector>
        </View>

        <Text style={styles.fsSwipeHint}>← swipe to browse →</Text>

        {/* Single, clean row of controls — replaces the old duplicated Prev/Next + pager rows. */}
        <View style={styles.fsBottom}>
          <TouchableOpacity style={styles.fsNavBtn} onPress={goPrev}>
            <Text style={styles.fsNavBtnText}>‹ Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fsNavBtn} onPress={handleListen}>
            <Text style={styles.fsNavBtnText}>{speaking ? '⏹ Stop' : '🔊 Listen'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fsNavBtn} onPress={goNext}>
            <Text style={styles.fsNavBtnText}>Next ›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.fsAddBtn} onPress={onAdd}>
          <Text style={styles.fsAddBtnText}>＋ Add desire card</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Edit modal — title + body + color swatches, matches mvEditFeelCard.
function FeelEditModal({ visible, card, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [colorKey, setColorKey] = useState('pink');

  useEffect(() => {
    if (visible && card) {
      setTitle(card.state || '');
      setBody(card.what || '');
      setColorKey(card.color || 'pink');
    }
  }, [visible, card]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.editScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.editHeading}>✨ Desire card</Text>
          <Text style={styles.label}>NAME</Text>
          <TextInput
            style={styles.editTitleInput}
            placeholder="Desire name…"
            placeholderTextColor="rgba(46,37,48,0.4)"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>HOW DOES IT FEEL?</Text>
          <Text style={styles.editHint}>Write as if you are already living it. What do you feel inside your body?</Text>
          <ExpandableTextArea
            value={body}
            onChangeText={setBody}
            placeholder="I feel so light and free… my chest is warm and open…"
            modalTitle="Feel It"
            minHeight={140}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>CARD COLOUR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {FEEL_COLOR_PALETTE.map((cp) => (
              <TouchableOpacity key={cp.key} onPress={() => setColorKey(cp.key)}>
                <LinearGradient
                  colors={cp.colors}
                  style={[styles.swatch, colorKey === cp.key && styles.swatchActive]}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.editBtnRow}>
            <Button title="Save ✨" size="sm" onPress={() => onSave({ title: title.trim(), body: body.trim(), color: colorKey })} style={{ flex: 1 }} />
            <Button title="Cancel" size="sm" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          </View>
          {card ? (
            <TouchableOpacity style={styles.editDeleteRow} onPress={onDelete}>
              <Text style={styles.editDeleteText}>🗑️ Delete card</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </GradientBackground>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function FeelIt() {
  const { limits, refresh } = usePlanStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  // My Feel Cards state
  const [myCards, setMyCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  // Default view is the full-screen swipeable single-card reader (matches
  // the website) -- the grid is only reached via the X/"view all" action.
  const [feelView, setFeelView] = useState('fullscreen'); // 'grid' | 'fullscreen'
  const [stackIndex, setStackIndex] = useState(0);
  const [editingCard, setEditingCard] = useState(null); // card object, or {} for new
  const [editVisible, setEditVisible] = useState(false);

  const loadCards = async () => {
    try {
      const data = await getFeelItCards();
      const sorted = [...data].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setMyCards(sorted);
    } catch (_) {}
  };

  useEffect(() => { refresh(); loadCards().finally(() => setLoadingCards(false)); }, []);

  const openCard = (index) => { setStackIndex(index); setFeelView('fullscreen'); };
  const closeToGrid = () => setFeelView('grid');

  const startEdit = (cardOrNull) => { setEditingCard(cardOrNull); setEditVisible(true); };
  const startAdd = () => { setEditingCard(null); setEditVisible(true); };

  const handleSaveEdit = async ({ title, body, color }) => {
    if (!title) { setEditVisible(false); return; }
    setEditVisible(false);
    if (editingCard && editingCard.id) {
      const updated = { ...editingCard, state: title, what: body, color };
      setMyCards((prev) => prev.map((c) => (c.id === editingCard.id ? updated : c)));
      try { await updateFeelItCard(editingCard.id, { state: title, what: body, color }); } catch (_) {}
    } else {
      const cap = limits?.feelit_cards_total;
      if (cap != null && myCards.length >= cap) {
        setUpgradeMsg(`You've reached your ${cap} free Feel It cards -- upgrade for more room.`);
        setShowUpgrade(true);
        return;
      }
      try {
        const row = await saveFeelItCard({ state: title, what: body, color, display_order: myCards.length });
        setMyCards((prev) => [...prev, row]);
      } catch (e) {
        if (e.status === 403) { setUpgradeMsg(e.message || 'Upgrade for more Feel It cards.'); setShowUpgrade(true); }
      }
    }
  };

  const handleDeleteCard = (targetCard) => {
    Alert.alert('Delete this card?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setEditVisible(false);
        setFeelView('grid');
        try { await deleteFeelItCard(targetCard.id); } catch (_) {}
        setMyCards((prev) => prev.filter((c) => c.id !== targetCard.id));
      } },
    ]);
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>

        <ScreenHeader lead="Feel It" accent="Cards" subtitle="Transmute your emotional state ✨" />

        {/* ── MY FEEL CARDS — grid of small colored cards; tap to open into a
             full-screen swipeable reader; X returns to this grid. No AI/
             backend generation here — cards are written and saved by hand. ── */}
        {loadingCards ? (
          <ActivityIndicator color="#c9a8c9" style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.hintText}>✦ Tap a card to read it full screen ✨</Text>
            <View style={styles.grid}>
              <TouchableOpacity style={styles.addTile} onPress={startAdd}>
                <Text style={styles.addTileIcon}>＋</Text>
                <Text style={styles.addTileLabel}>Add desire card</Text>
              </TouchableOpacity>
              {myCards.map((c, i) => (
                <FeelGridCard
                  key={c.id}
                  card={c}
                  index={i}
                  onOpen={() => openCard(i)}
                  onEdit={() => startEdit(c)}
                  onDelete={() => handleDeleteCard(c)}
                />
              ))}
            </View>
          </>
        )}

      </ScrollView>

      {feelView === 'fullscreen' && myCards.length > 0 && (
        <FeelFullScreen
          cards={myCards}
          index={Math.min(stackIndex, myCards.length - 1)}
          onIndexChange={setStackIndex}
          onClose={closeToGrid}
          onEdit={() => startEdit(myCards[stackIndex])}
          onDelete={() => handleDeleteCard(myCards[stackIndex])}
          onAdd={startAdd}
        />
      )}

      <FeelEditModal
        visible={editVisible}
        card={editingCard}
        onClose={() => setEditVisible(false)}
        onSave={handleSaveEdit}
        onDelete={() => editingCard && handleDeleteCard(editingCard)}
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
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },

  hintText: { fontFamily: fonts.displayItalic, fontSize: 12, color: colors.mist, fontStyle: 'italic', marginBottom: 12, textAlign: 'center' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  addTile: {
    width: '47%', minHeight: 150, borderRadius: radii.md, borderWidth: 2, borderStyle: 'dashed',
    borderColor: 'rgba(201,168,201,0.4)', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addTileIcon: { fontSize: 22, color: 'rgba(180,130,200,0.5)' },
  addTileLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.mist },

  gridCardWrap: { width: '47%' },
  gridCard: {
    minHeight: 150, borderRadius: radii.md, padding: 14, borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  gridCardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginBottom: 6 },
  gridIconBtn: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  gridIconText: { fontSize: 11 },
  gridCardTitle: { fontFamily: fonts.displayMedium, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  gridCardPreview: { fontFamily: fonts.displayItalic, fontSize: 13.5, fontStyle: 'italic', lineHeight: 19, opacity: 0.9 },

  // Full-screen reader
  fsRoot: { flex: 1, backgroundColor: colors.white },
  fsNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 54, paddingHorizontal: 20, paddingBottom: 14 },
  fsCloseIcon: { fontSize: 18, color: colors.ink2, fontWeight: '600' },
  fsCounter: { fontFamily: fonts.displayItalic, fontSize: 13, fontStyle: 'italic', fontWeight: '600', color: colors.mist },
  fsNavBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: 'rgba(201,168,201,0.18)' },
  fsNavBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, fontWeight: '600', color: colors.purpleDark },

  // Card area — bounded box (not full screen) so the heading pins to the
  // TOP of the card and the body centers within the card, rather than
  // floating anywhere across the whole screen.
  fsCardArea: { flex: 1, paddingHorizontal: 14, paddingBottom: 6 },
  // The Animated.View wrapping the card needs its own flex:1 — the animated
  // style object only carries transform/opacity, so without this the card's
  // flex:1 below has no size to flex against and collapses to near-zero
  // height (only its padding shows, as a thin bordered strip).
  fsCardAnimatedWrap: { flex: 1 },
  fsCard: {
    flex: 1, borderRadius: radii.lg, borderWidth: 1.5,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 6,
  },
  fsDesire: { fontFamily: fonts.bodyMedium, fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
  fsBody: { flex: 1 },
  fsBodyScroll: { flexGrow: 1, paddingVertical: 10 },
  fsText: { fontFamily: fonts.displayItalic, fontSize: 20, fontStyle: 'italic', fontWeight: '300', lineHeight: 30 },
  fsSwipeHint: { textAlign: 'center', fontFamily: fonts.body, fontSize: 11, color: colors.mist, marginBottom: 6, opacity: 0.7 },

  fsBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  fsAddBtn: { alignSelf: 'center', marginTop: 4, marginBottom: 30, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radii.pill, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(154,95,168,0.4)' },
  fsAddBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13, fontWeight: '600', color: colors.purpleDark },

  // Edit modal
  editScroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  editHeading: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginBottom: 16 },
  editTitleInput: {
    fontFamily: fonts.displayItalic, fontSize: 16, fontStyle: 'italic', color: colors.purpleDark,
    borderWidth: 1.5, borderColor: 'rgba(248,184,200,0.35)', borderRadius: radii.md,
    paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.9)',
  },
  editHint: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, lineHeight: 18, marginBottom: 8 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: colors.purpleDark },
  editBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  editDeleteRow: { alignSelf: 'center', marginTop: 16 },
  editDeleteText: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(160,60,60,0.7)' },
});
