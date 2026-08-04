import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, fonts, radii } from '../../constants/theme';

const VIEW_MODE_KEY = 'mv_more_view_mode';
const ORDER_KEY = 'mv_more_tool_order';
const ROW_HEIGHT = 74;

// Order follows the website's own nav bar sequence (index.html), grouped
// into readable categories -- Affirm / Stories / Vision Board / Settings
// are left out here since they're already bottom tabs on the app.
const SECTIONS = [
  {
    title: 'Watch & Listen',
    tools: [
      { key: 'meditate', label: 'Meditate', icon: 'leaf-outline', desc: 'Breath timer, med timer, guided sessions' },
      { key: 'mindmovie', label: 'Mind Movie', icon: 'film-outline', desc: 'Cinematic scenes of your future' },
      { key: 'subliminal', label: 'Subliminal', icon: 'moon-outline', desc: 'Background reprogramming audio' },
    ],
  },
  {
    title: 'Daily Practice',
    tools: [
      { key: 'scripting', label: 'Scripting', icon: 'create-outline', desc: 'Script your day as it happens' },
      { key: 'gratitude', label: 'Gratitude', icon: 'heart-outline', desc: 'Daily gratitude journal' },
      { key: 'practice', label: 'Practice', icon: 'flower-outline', desc: 'Methods to try & manifestation tools' },
    ],
  },
  {
    title: 'Desires & Wins',
    tools: [
      { key: 'desire-action', label: 'Desire Action', icon: 'footsteps-outline', desc: 'Daily practice tracker per desire' },
      { key: 'feelit', label: 'Feel It', icon: 'pulse-outline', desc: 'Move through any feeling' },
      { key: 'manifested', label: 'Manifested', icon: 'trophy-outline', desc: 'Celebrate your wins' },
    ],
  },
  {
    title: 'Mindset & Self',
    tools: [
      { key: 'futureself', label: 'Self', icon: 'person-outline', desc: 'Identity, portrait, bridge & letters from who you\'re becoming' },
      { key: 'beliefs', label: 'Limiting Beliefs', icon: 'bulb-outline', desc: 'Reframe what holds you back' },
      { key: 'letgo', label: 'Let Go', icon: 'leaf-outline', desc: 'Release what no longer serves you' },
    ],
  },
  {
    title: 'Insights',
    tools: [
      { key: 'desire-hub', label: 'Desires', icon: 'planet-outline', desc: 'Your full desire hub' },
      { key: 'daily', label: 'Daily Energy', icon: 'sparkles-outline', desc: "Today's message, oracle pull & horoscope" },
      { key: 'tracker', label: 'Tracker', icon: 'stats-chart-outline', desc: 'Your practice stats & plan usage' },
    ],
  },
  {
    title: 'Create & Community',
    tools: [
      { key: 'aura-card', label: 'Aura Card', icon: 'color-palette-outline', desc: 'Generate a shareable aura card' },
      { key: 'discover', label: 'Discover', icon: 'compass-outline', desc: 'Posts, guides & all 17 techniques' },
      { key: 'community', label: 'Community Feed', icon: 'people-outline', desc: 'Share intentions with others' },
    ],
  },
];

const ALL_TOOLS = SECTIONS.flatMap((s) => s.tools);
const DEFAULT_ORDER = ALL_TOOLS.map((t) => t.key);

// A single list row that can be long-pressed on its drag handle and dragged
// up/down to reorder — the handle carries the gesture, the whole row carries
// the animated transform, so plain taps elsewhere on the row still navigate.
function ReorderableRow({ tool, index, total, isLast, onPress, onDragEnd, onDragStateChange }) {
  const translateY = useSharedValue(0);
  // The handle has its own dedicated hit area (separate from the row's tap
  // target below), so a plain Pan gesture is enough to disambiguate
  // dragging from navigating — no long-press gate or gesture composition
  // needed.
  const pan = Gesture.Pan()
    .onStart(() => {
      runOnJS(onDragStateChange)(true);
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const delta = Math.round(e.translationY / ROW_HEIGHT);
      const newIndex = Math.max(0, Math.min(total - 1, index + delta));
      translateY.value = withTiming(0);
      runOnJS(onDragStateChange)(false);
      if (newIndex !== index) runOnJS(onDragEnd)(index, newIndex);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: translateY.value !== 0 ? 10 : 0,
    shadowOpacity: translateY.value !== 0 ? 0.18 : 0,
  }));

  return (
    <Animated.View style={[styles.row, !isLast && styles.rowDivider, rowStyle]}>
      <TouchableOpacity style={styles.rowMain} onPress={onPress}>
        <View style={styles.iconWrap}>
          <Ionicons name={tool.icon} size={20} color={colors.purpleDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{tool.label}</Text>
          <Text style={styles.rowDesc}>{tool.desc}</Text>
        </View>
      </TouchableOpacity>
      <GestureDetector gesture={pan}>
        <View style={styles.dragHandle}>
          <Ionicons name="reorder-three-outline" size={20} color={colors.mist2} />
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

export default function More() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [viewMode, setViewMode] = useState('tile'); // 'tile' | 'list'
  const [order, setOrder] = useState(DEFAULT_ORDER);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const mode = await AsyncStorage.getItem(VIEW_MODE_KEY);
        if (mode === 'tile' || mode === 'list') setViewMode(mode);
      } catch (_) {}
      try {
        const saved = await AsyncStorage.getItem(ORDER_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Stay resilient to tools being added/removed in code: keep saved
          // order for keys that still exist, then append anything new.
          const known = new Set(DEFAULT_ORDER);
          const kept = parsed.filter((k) => known.has(k));
          const missing = DEFAULT_ORDER.filter((k) => !kept.includes(k));
          setOrder([...kept, ...missing]);
        }
      } catch (_) {}
    })();
  }, []);

  const handleSetViewMode = async (mode) => {
    setViewMode(mode);
    try { await AsyncStorage.setItem(VIEW_MODE_KEY, mode); } catch (_) {}
  };

  const handleReorder = (fromIndex, toIndex) => {
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      AsyncStorage.setItem(ORDER_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const orderedTools = order.map((key) => ALL_TOOLS.find((t) => t.key === key)).filter(Boolean);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 14, paddingBottom: 40 }} scrollEnabled={!dragging}>
        <ScreenHeader lead="More T" accent="ools" subtitle="Every practice, all in one place ✨" />

        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modeBtn, viewMode === 'tile' && styles.modeBtnOn]} onPress={() => handleSetViewMode('tile')}>
            <Text style={[styles.modeBtnText, viewMode === 'tile' && styles.modeBtnTextOn]}>🔲 Tiles</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, viewMode === 'list' && styles.modeBtnOn]} onPress={() => handleSetViewMode('list')}>
            <Text style={[styles.modeBtnText, viewMode === 'list' && styles.modeBtnTextOn]}>☰ List</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'tile' ? (
          <>
            <Text style={styles.hintText}>Quick tap access, grouped by category ✨</Text>
            {SECTIONS.map((section) => (
              <View key={section.title} style={{ marginBottom: 18 }}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.tileGrid}>
                  {section.tools.map((tool) => (
                    <TouchableOpacity key={tool.key} style={styles.tile} onPress={() => router.push(`/${tool.key}`)}>
                      <View style={styles.tileIconWrap}>
                        <Ionicons name={tool.icon} size={22} color={colors.purpleDark} />
                      </View>
                      <Text style={styles.tileLabel} numberOfLines={2}>{tool.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.hintText}>Press and hold ☰ to drag a tool into your own order ✨</Text>
            <GlassCard noPadding style={styles.sectionCard}>
              {orderedTools.map((tool, i) => (
                <ReorderableRow
                  key={tool.key}
                  tool={tool}
                  index={i}
                  total={orderedTools.length}
                  isLast={i === orderedTools.length - 1}
                  onPress={() => router.push(`/${tool.key}`)}
                  onDragEnd={handleReorder}
                  onDragStateChange={setDragging}
                />
              ))}
            </GlassCard>
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  hintText: { fontFamily: fonts.displayItalic, color: colors.mist, fontSize: 12, marginBottom: 14, fontStyle: 'italic' },

  modeRow: { flexDirection: 'row', backgroundColor: 'rgba(201,168,201,0.12)', borderRadius: radii.pill, padding: 4, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: radii.pill, alignItems: 'center' },
  modeBtnOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  modeBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.mist, fontWeight: '500' },
  modeBtnTextOn: { color: colors.ink, fontWeight: '700' },

  sectionTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  sectionCard: {},

  /* Tile mode */
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31%', backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center' },
  tileIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.65)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  tileLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, fontWeight: '600', color: colors.ink, textAlign: 'center' },

  /* List mode */
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', shadowColor: '#c878b4', shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.12)' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  rowDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.mist },
  dragHandle: { paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
});
