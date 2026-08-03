import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import GlassCard from '../GlassCard';
import { generateToneFile } from '../../services/toneGenerator';
import { getFunToolData, saveFunToolData } from '../../services/api';

const PLAYS_KEY = 'mv_frequency_plays_local';

const STATIONS = [
  { id: 'love', label: '💗 Love', hz: 528, beatHz: 7, baseFreq: 174, color: '#f090b8',
    desc: '528 Hz — the frequency of love, transformation and DNA repair. Called the "miracle tone", it opens the heart and restores harmony.',
    affirmations: ['I am deeply loved and worthy of love', 'Love flows to me freely and abundantly', 'My heart is open and I attract loving relationships', 'I give and receive love with ease'],
    bodyScan: 'Focus on your heart centre. Feel it expand with each breath. Warmth spreads from your chest outward.' },
  { id: 'money', label: '💰 Money', hz: 888, beatHz: 10, baseFreq: 196, color: '#d4af37',
    desc: '888 Hz — the frequency of infinite abundance and financial flow. Aligned with the energy of prosperity and unlimited potential.',
    affirmations: ['Money flows to me easily and effortlessly', 'I am a powerful money magnet', 'Abundance is my natural state', 'I attract wealth from multiple sources'],
    bodyScan: 'Feel the energy in your hands and lower belly — your centres of giving, receiving and security. Let them relax and open.' },
  { id: 'health', label: '🌿 Health', hz: 432, beatHz: 6, baseFreq: 136, color: '#6ecfa0',
    desc: '432 Hz — the healing frequency, in harmony with the natural world. Reduces tension and promotes cellular wellbeing.',
    affirmations: ['My body is healing and thriving', 'Every cell in my body vibrates with health', 'I am grateful for my strong, vital body', 'Vibrant energy flows through me'],
    bodyScan: 'Scan from your crown slowly down. At each point — head, throat, chest, belly, hips, legs — breathe in golden light and release any tightness.' },
  { id: 'confidence', label: '👑 Power', hz: 417, beatHz: 14, baseFreq: 128, color: '#b880d8',
    desc: '417 Hz — the frequency of transformation, clearing negativity and facilitating change. Breaks through blocks and restores personal power.',
    affirmations: ['I am powerful, capable and magnetic', 'Confidence is my natural state', 'I trust myself completely', 'I walk into every room knowing my worth'],
    bodyScan: 'Bring attention to your solar plexus — just above your navel. This is your power centre. Breathe fire into it. Feel it strengthen.' },
  { id: 'clarity', label: '🔮 Clarity', hz: 396, beatHz: 8, baseFreq: 120, color: '#70c0f0',
    desc: '396 Hz — liberating guilt and fear, releasing blocks to manifestation. Creates mental clarity and dissolves subconscious resistance.',
    affirmations: ['I see my path clearly', 'I release all fear and doubt', 'My mind is clear and my decisions are inspired', 'I trust my intuition completely'],
    bodyScan: 'Focus between your eyebrows — your third eye. Feel it open gently like a lens adjusting to perfect focus. Everything is clear.' },
];

export default function FrequencyTunerTool() {
  const [activeId, setActiveId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [playCounts, setPlayCounts] = useState({});
  const soundRef = useRef(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false }).catch(() => {});
    (async () => {
      try {
        const local = await AsyncStorage.getItem(PLAYS_KEY);
        if (local) setPlayCounts(JSON.parse(local));
      } catch (e) {}
      try {
        const remote = await getFunToolData('fun_frequency');
        if (remote && typeof remote === 'object') setPlayCounts(remote);
      } catch (e) {}
    })();
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  const persistCounts = useCallback(async (next) => {
    try { await AsyncStorage.setItem(PLAYS_KEY, JSON.stringify(next)); } catch (e) {}
    try { await saveFunToolData('fun_frequency', next); } catch (e) {}
  }, []);

  const stopTone = async () => {
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (e) {}
      soundRef.current = null;
    }
    setActiveId(null);
  };

  const playStation = async (station) => {
    if (activeId === station.id) { await stopTone(); return; }
    await stopTone();
    setLoadingId(station.id);
    try {
      const uri = await generateToneFile({
        leftFreq: station.baseFreq,
        rightFreq: station.baseFreq + station.beatHz,
        durationSec: 12,
      });
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, isLooping: true, volume: 0.7 });
      soundRef.current = sound;
      setActiveId(station.id);
      const nextCounts = { ...playCounts, [station.id]: (playCounts[station.id] || 0) + 1 };
      setPlayCounts(nextCounts);
      persistCounts(nextCounts);
    } catch (e) {
      // silently fail to keep UX calm; could surface a toast here
    } finally {
      setLoadingId(null);
    }
  };

  return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <Text style={styles.title}>Frequency <Text style={styles.titleAccent}>Tuner</Text></Text>
        <Text style={styles.subtitle}>Solfeggio binaural tones to shift your state. Headphones recommended 🎧</Text>

        {STATIONS.map((station) => {
          const isActive = activeId === station.id;
          const isLoading = loadingId === station.id;
          return (
            <GlassCard key={station.id} style={{ marginBottom: 14, borderColor: isActive ? station.color : undefined }}>
              <View style={styles.stHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stLabel}>{station.label}</Text>
                  <Text style={styles.stHz}>
                    {station.hz} Hz · {station.beatHz} Hz beat
                    {playCounts[station.id] ? ` · played ${playCounts[station.id]}x` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.playBtn, { backgroundColor: isActive ? station.color : 'rgba(201,168,201,0.18)' }]}
                  onPress={() => playStation(station)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={isActive ? '#fff' : '#9a5fa8'} />
                  ) : (
                    <Text style={[styles.playBtnText, { color: isActive ? '#fff' : '#9a5fa8' }]}>{isActive ? '■ Stop' : '▶ Play'}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {isActive && (
                <View style={styles.playingRow}>
                  <View style={[styles.dot, { backgroundColor: station.color }]} />
                  <View style={[styles.dot, { backgroundColor: station.color }]} />
                  <View style={[styles.dot, { backgroundColor: station.color }]} />
                  <Text style={styles.playingText}>Now playing — let it wash over you</Text>
                </View>
              )}

              <Text style={styles.stDesc}>{station.desc}</Text>

              <Text style={styles.sectionLbl}>Body Focus</Text>
              <Text style={styles.bodyScan}>{station.bodyScan}</Text>

              <Text style={styles.sectionLbl}>Affirmations</Text>
              {station.affirmations.map((a, i) => (
                <Text key={i} style={styles.affirm}>✦ {a}</Text>
              ))}
            </GlassCard>
          );
        })}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500' },

  stHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stLabel: { fontSize: 16, fontWeight: '600', color: '#2e2530' },
  stHz: { fontSize: 11, color: '#6b5c66', marginTop: 2 },
  playBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 50, minWidth: 76, alignItems: 'center' },
  playBtnText: { fontSize: 12.5, fontWeight: '600' },

  playingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
  playingText: { fontSize: 11, color: '#6b5c66', fontWeight: '600', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  stDesc: { fontSize: 13, color: '#2e2530', lineHeight: 19, marginBottom: 12 },
  sectionLbl: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#9a5fa8', marginBottom: 6, marginTop: 4 },
  bodyScan: { fontSize: 12.5, color: '#6b5c66', fontStyle: 'italic', lineHeight: 18, marginBottom: 12 },
  affirm: { fontSize: 12.5, color: '#2e2530', lineHeight: 19, marginBottom: 3 },
});