import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlassCard from '../GlassCard';
import { generateToneFile } from '../../services/toneGenerator';
import { getFunToolData, saveFunToolData } from '../../services/api';

const BEAT_KEY = 'mv_beat_local';

const TEMPOS = [
  { id: 'calm', label: '🕊️ Calm (60 BPM)', bpm: 60 },
  { id: 'medium', label: '🔥 Medium (90 BPM)', bpm: 90 },
  { id: 'hype', label: '⚡ Hype (120 BPM)', bpm: 120 },
];
const CATEGORIES = [
  { id: 'money', label: '💰 Money' },
  { id: 'love', label: '💗 Love' },
  { id: 'confidence', label: '👑 Confidence' },
  { id: 'health', label: '🌿 Health' },
  { id: 'general', label: '✨ General' },
];

const BEAT_SETS = {
  money: {
    calm: ['Money flows to me with ease', 'I am open to receive', 'Abundance is my birthright', 'Wealth finds its way to me', 'I am financially free'],
    medium: ['Money comes to me fast', 'I attract what I need', 'My income grows every day', 'Wealth is natural for me', 'Rich thoughts rich life'],
    hype: ['I am a money magnet', 'Cash flows in constantly', 'Wealthy minded always', 'Abundance never stops', 'Money loves me back'],
  },
  love: {
    calm: ['Love is always around me', 'I am worthy of deep love', 'My heart is open wide', 'Love finds me easily', 'I give and receive love freely'],
    medium: ['Love is coming to me', 'I attract my perfect match', 'I am loved completely', 'My relationship is beautiful', 'Love is here for me'],
    hype: ['Love is mine right now', 'I am deeply adored', 'My heart is full always', 'Love chooses me daily', 'I am love I am loved'],
  },
  confidence: {
    calm: ['I am enough as I am', 'I trust my inner wisdom', 'I walk with quiet power', 'I belong in every room', 'Confidence is natural to me'],
    medium: ['I own my power fully', 'I show up strong always', 'People respect and value me', 'I speak with authority', 'My confidence grows daily'],
    hype: ['I am unstoppable now', 'Power moves through me', 'I win I grow I rise', 'Limitless and unafraid', 'I am my own legend'],
  },
  health: {
    calm: ['My body is healing now', 'I am strong and well', 'Every cell glows with life', 'I nourish myself with love', 'My health is my wealth'],
    medium: ['I feel amazing daily', 'My body works perfectly', 'Energy fills every part', 'I am healthy and strong', 'Vitality is my truth'],
    hype: ['Body strong mind clear', 'I am fully alive now', 'Health runs through me', 'Thriving every single day', 'My body is my power'],
  },
  general: {
    calm: ['Everything always works out', 'I am guided and protected', 'Life supports me fully', 'I trust the universe', 'Good things come to me'],
    medium: ['I manifest with ease', 'My desires are on the way', 'I believe in my dreams', 'The universe provides', 'I am a powerful creator'],
    hype: ['I create my reality', 'I am unstoppable now', 'Everything is working out', 'I receive all I desire', 'My life is incredible'],
  },
};

export default function BeatBuilderTool() {
  const [tempo, setTempo] = useState(null);
  const [category, setCategory] = useState(null);
  const [lines, setLines] = useState([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);
  const clickSoundRef = useRef(null);
  const clickUriRef = useRef(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (clickSoundRef.current) clickSoundRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    (async () => {
      let state = null;
      try {
        const local = await AsyncStorage.getItem(BEAT_KEY);
        if (local) state = JSON.parse(local);
      } catch (e) {}
      try {
        const remote = await getFunToolData('fun_beat');
        if (remote) state = remote;
      } catch (e) {}
      if (state) {
        if (state.tempo !== undefined) setTempo(state.tempo);
        if (state.category !== undefined) setCategory(state.category);
      }
    })();
  }, []);

  const persist = useCallback(async (nextTempo, nextCategory) => {
    const state = { tempo: nextTempo, category: nextCategory };
    try { await AsyncStorage.setItem(BEAT_KEY, JSON.stringify(state)); } catch (e) {}
    try { await saveFunToolData('fun_beat', state); } catch (e) {}
  }, []);

  const ensureClickSound = async () => {
    if (!clickUriRef.current) {
      clickUriRef.current = await generateToneFile({ leftFreq: 600, rightFreq: 600, durationSec: 0.08, amplitude: 0.3 });
    }
    return clickUriRef.current;
  };

  const playClick = async () => {
    try {
      const uri = await ensureClickSound();
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 0.5 });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) sound.unloadAsync().catch(() => {});
      });
    } catch (e) {}
  };

  const stopBeat = () => {
    setPlaying(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const startBeat = () => {
    if (!lines.length) return;
    setPlaying(true);
    const bpm = TEMPOS.find((t) => t.id === tempo)?.bpm || 80;
    setCurrentLine(0);
    playClick();
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % lines.length;
      setCurrentLine(idx);
      playClick();
    }, Math.round(60000 / bpm));
  };

  const handleTempoSelect = (id) => {
    stopBeat();
    setTempo(id);
    setLines([]);
    persist(id, category);
  };
  const handleCategorySelect = (id) => {
    stopBeat();
    setCategory(id);
    setLines([]);
    persist(tempo, id);
  };
  const handleBuild = () => {
    if (!tempo || !category) return;
    stopBeat();
    const set = (BEAT_SETS[category] || BEAT_SETS.general)[tempo] || [];
    setLines(set);
    setCurrentLine(0);
  };
  const handleToggle = () => {
    if (playing) stopBeat();
    else startBeat();
  };

  const bpmVal = TEMPOS.find((t) => t.id === tempo)?.bpm;

  return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <Text style={styles.title}>Affirmation Beat <Text style={styles.titleAccent}>Builder</Text></Text>
        <Text style={styles.subtitle}>Build a rhythmic affirmation loop tuned to your energy.</Text>

        <Text style={styles.sectionLbl}>Choose your tempo</Text>
        <View style={styles.chipsRow}>
          {TEMPOS.map((t) => (
            <TouchableOpacity key={t.id} style={[styles.chip, tempo === t.id && styles.chipOn]} onPress={() => handleTempoSelect(t.id)}>
              <Text style={[styles.chipText, tempo === t.id && styles.chipTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLbl}>Choose your category</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c.id} style={[styles.chip, category === c.id && styles.chipOn]} onPress={() => handleCategorySelect(c.id)}>
              <Text style={[styles.chipText, category === c.id && styles.chipTextOn]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.buildBtn, (!tempo || !category) && styles.buildBtnDisabled]}
          onPress={handleBuild}
          disabled={!tempo || !category}
        >
          <Text style={styles.buildBtnText}>🎵 Build My Beat</Text>
        </TouchableOpacity>

        {lines.length > 0 && tempo && category && (
          <View style={styles.player}>
            <Text style={styles.playerTempo}>{bpmVal} BPM · {tempo.toUpperCase()} · {category.toUpperCase()}</Text>
            <View style={styles.lines}>
              {lines.map((l, i) => (
                <Text key={i} style={[styles.line, i === currentLine && styles.lineActive]}>{l}</Text>
              ))}
            </View>
            <View style={styles.controls}>
              <TouchableOpacity style={styles.playBtn} onPress={handleToggle}>
                <Text style={styles.playBtnText}>{playing ? '■' : '▶'}</Text>
              </TouchableOpacity>
              <View style={styles.pulseDots}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[styles.pulseDot, playing && currentLine % 4 === i && styles.pulseDotHit]} />
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500' },

  sectionLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#9a5fa8', marginBottom: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', backgroundColor: 'rgba(255,255,255,0.7)' },
  chipOn: { backgroundColor: '#c9a8c9', borderColor: 'transparent' },
  chipText: { fontSize: 12.5, fontWeight: '500', color: '#6b5c66' },
  chipTextOn: { color: '#fff' },

  buildBtn: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 15, alignItems: 'center', marginBottom: 16, shadowColor: '#b888b8', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  buildBtnDisabled: { opacity: 0.4 },
  buildBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '700', letterSpacing: 0.3 },

  player: { backgroundColor: '#0d0820', borderRadius: 20, padding: 22, marginBottom: 16 },
  playerTempo: { fontSize: 10.5, letterSpacing: 1.4, color: 'rgba(255,255,255,0.4)', marginBottom: 12, textTransform: 'uppercase' },
  lines: { marginBottom: 16, gap: 2 },
  line: { fontSize: 16, fontWeight: '300', color: 'rgba(255,255,255,0.55)', lineHeight: 24, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6 },
  lineActive: { color: '#fff', fontSize: 17, backgroundColor: 'rgba(240,208,96,0.12)', borderLeftWidth: 2, borderLeftColor: '#f0d060', paddingLeft: 10 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0d060', justifyContent: 'center', alignItems: 'center' },
  playBtnText: { fontSize: 17, color: '#1a0f38' },
  pulseDots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pulseDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(240,208,96,0.25)' },
  pulseDotHit: { backgroundColor: '#f0d060' },
});