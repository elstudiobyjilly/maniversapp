import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing } from 'react-native';

const BUBBLE_MODES = {
  shield: {
    name: '🛡️ Morning Shield', color1: '#b880d8', color2: '#70c0f0',
    steps: [
      { ic: '🌬️', title: 'Ground & Breathe', desc: 'Sit or stand comfortably. Feel your feet on the earth. Take 3 deep, slow breaths. With each inhale, feel energy rising from the ground into your body.', secs: 20 },
      { ic: '🌟', title: 'Activate Your Core', desc: 'Imagine a bright white or golden light at the centre of your chest. This is your energy core — your inner sun. Feel it warm, steady and powerful.', secs: 25 },
      { ic: '🫧', title: 'Expand the Bubble', desc: 'With each exhale, see that light expanding outward from your body — growing larger, forming a luminous bubble around your entire being. It shimmers and holds.', secs: 30 },
      { ic: '🛡️', title: 'Set the Intention', desc: 'Declare silently or aloud: "Only love and aligned energy may enter this field. I am protected. I am clear. I move through my day shielded and grounded."', secs: 25 },
      { ic: '✦', title: 'Seal & Lock', desc: 'Take one final deep breath. Feel the bubble solidify around you — weightless but impenetrable. You carry it with you all day. It goes where you go.', secs: 20 },
    ],
  },
  clear: {
    name: '🌊 Evening Clear', color1: '#70c0f0', color2: '#6ecfa0',
    steps: [
      { ic: '😮‍💨', title: 'Long Release Exhale', desc: 'Sit or lie down. Let out a long, audible exhale — release the whole day with this breath. Feel your shoulders drop. Your jaw unclench. Your belly soften.', secs: 20 },
      { ic: '🚿', title: 'Energy Shower', desc: 'Imagine a gentle waterfall of white light pouring over you from above. Feel it wash over your head, shoulders, body — dissolving any energy that is not yours.', secs: 30 },
      { ic: '🍃', title: "Release What Isn't Yours", desc: 'Any emotions, tensions, or energies you absorbed today — consciously name them and let them go. Say: "I release what is not mine. I return it with love."', secs: 25 },
      { ic: '💗', title: 'Fill With Your Own Light', desc: 'Now imagine warm rose-gold light filling all the space that was cleared. This is YOUR energy — pure, loving, and replenished. Feel full and restored.', secs: 25 },
      { ic: '🌙', title: 'Rest Intention', desc: 'Place your hands on your heart. Say: "I am clear. I am mine. I release today fully. My body and energy restore completely as I sleep tonight." Rest.', secs: 20 },
    ],
  },
};

export default function ProtectionBubbleTool() {
  const [mode, setMode] = useState('shield');
  const [step, setStep] = useState(-1); // -1 = intro, steps.length = complete
  const [secsLeft, setSecsLeft] = useState(0);
  const intervalRef = useRef(null);
  const pulse = useRef(new Animated.Value(0)).current;

  const modeData = BUBBLE_MODES[mode];
  const steps = modeData.steps;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const stopTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const startTimerFor = (stepIdx) => {
    stopTimer();
    const s = steps[stepIdx];
    if (!s) return;
    setSecsLeft(s.secs);
    let remaining = s.secs;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        stopTimer();
        setTimeout(() => {
          if (stepIdx < steps.length - 1) {
            setStep(stepIdx + 1);
            startTimerFor(stepIdx + 1);
          } else {
            setStep(steps.length);
          }
        }, 400);
      }
      setSecsLeft(Math.max(0, remaining));
    }, 1000);
  };

  const handleModeChange = (m) => {
    stopTimer();
    setMode(m);
    setStep(-1);
  };

  const handleBegin = () => {
    setStep(0);
    startTimerFor(0);
  };

  const handleNext = () => {
    stopTimer();
    const next = Math.min(step + 1, steps.length);
    setStep(next);
    if (next < steps.length) startTimerFor(next);
  };

  const handlePrev = () => {
    stopTimer();
    const prev = Math.max(step - 1, 0);
    setStep(prev);
    startTimerFor(prev);
  };

  const handleReset = () => {
    stopTimer();
    setStep(-1);
  };

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });

  const totalSecs = steps.reduce((s, st) => s + st.secs, 0);
  const currentStep = step >= 0 && step < steps.length ? steps[step] : null;
  const stepProgress = currentStep ? secsLeft / currentStep.secs : 0;

  return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <Text style={styles.title}>Protection <Text style={styles.titleAccent}>Bubble</Text></Text>
        <Text style={styles.subtitle}>A guided energetic shield, step by step.</Text>

        {step === -1 && (
          <View style={styles.modeRow}>
            {Object.keys(BUBBLE_MODES).map((k) => (
              <TouchableOpacity key={k} style={[styles.modeBtn, mode === k && styles.modeBtnOn]} onPress={() => handleModeChange(k)}>
                <Text style={[styles.modeBtnText, mode === k && styles.modeBtnTextOn]}>{BUBBLE_MODES[k].name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step >= 0 && step < steps.length && (
          <View style={styles.progressRow}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.progressDot, i < step && styles.progressDotDone, i === step && styles.progressDotCurrent]} />
            ))}
          </View>
        )}

        <View style={styles.visualWrap}>
          <Animated.View style={[styles.ring, { borderColor: modeData.color1, transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          <View style={[styles.ringInner, { borderColor: modeData.color2, opacity: 0.25 }]} />
          <View style={[styles.bubbleCore, { backgroundColor: modeData.color2 }]}>
            <Text style={styles.bubbleEmoji}>🪬</Text>
          </View>
        </View>

        {step === -1 && (
          <>
            <View style={styles.stepCard}>
              <Text style={styles.stepCardIc}>🪬</Text>
              <Text style={styles.stepCardTitle}>{modeData.name}</Text>
              <Text style={styles.stepCardMeta}>{steps.length} guided steps · ~{totalSecs} seconds</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleBegin}>
              <Text style={styles.primaryBtnText}>Begin →</Text>
            </TouchableOpacity>
          </>
        )}

        {currentStep && (
          <>
            <View style={styles.stepCard}>
              <Text style={styles.stepCardIc}>{currentStep.ic}</Text>
              <Text style={styles.stepCardTitle}>{currentStep.title}</Text>
              <Text style={styles.stepCardDesc}>{currentStep.desc}</Text>
              <View style={styles.timerWrap}>
                <View style={[styles.timerRing, { borderColor: modeData.color1, opacity: 0.25 + stepProgress * 0.5 }]}>
                  <Text style={styles.timerNum}>{secsLeft}</Text>
                </View>
              </View>
            </View>
            <View style={styles.navRow}>
              {step > 0 && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={handlePrev}>
                  <Text style={styles.secondaryBtnText}>← Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>{step < steps.length - 1 ? 'Next →' : 'Complete ✦'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step >= steps.length && (
          <>
            <View style={styles.completeWrap}>
              <Text style={styles.completeIc}>{mode === 'shield' ? '🛡️' : '🌙'}</Text>
              <Text style={styles.completeMsg}>
                {mode === 'shield'
                  ? 'Your protection bubble is set.\nYou are shielded, grounded, and ready.\nCarry this energy with you today.'
                  : 'Your energy is clear and restored.\nTonight you rest as purely yourself.\nSleep deeply. You are whole.'}
              </Text>
            </View>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset}>
              <Text style={styles.secondaryBtnText}>↩ Begin Again</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600', textAlign: 'center' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500', textAlign: 'center' },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 11, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', alignItems: 'center' },
  modeBtnOn: { backgroundColor: '#c9a8c9', borderColor: 'transparent' },
  modeBtnText: { fontSize: 12.5, fontWeight: '600', color: '#6b5c66', textAlign: 'center' },
  modeBtnTextOn: { color: '#fff' },

  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 10 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(201,168,201,0.2)', borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.3)' },
  progressDotDone: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  progressDotCurrent: { backgroundColor: '#9a5fa8', borderColor: '#9a5fa8', transform: [{ scale: 1.3 }] },

  visualWrap: { width: 200, height: 200, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  ring: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1.5 },
  ringInner: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 30 },
  bubbleCore: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', opacity: 0.85 },
  bubbleEmoji: { fontSize: 24 },

  stepCard: { backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.15)', borderRadius: 22, padding: 24, alignItems: 'center', marginBottom: 16, minHeight: 160, justifyContent: 'center' },
  stepCardIc: { fontSize: 32, marginBottom: 8 },
  stepCardTitle: { fontSize: 19, fontWeight: '500', color: '#2e2530', marginBottom: 6, textAlign: 'center' },
  stepCardDesc: { fontSize: 14.5, fontStyle: 'italic', color: '#6b5c66', lineHeight: 23, textAlign: 'center', maxWidth: 320 },
  stepCardMeta: { fontSize: 12.5, color: '#6b5c66' },

  timerWrap: { marginTop: 16 },
  timerRing: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  timerNum: { fontSize: 22, fontWeight: '300', color: '#9a5fa8' },

  navRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '600' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', borderRadius: 50, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: '#6b5c66', fontSize: 14, fontWeight: '600' },

  completeWrap: { alignItems: 'center', padding: 24, marginBottom: 16 },
  completeIc: { fontSize: 44, marginBottom: 10 },
  completeMsg: { fontSize: 17, fontStyle: 'italic', color: '#2e2530', textAlign: 'center', lineHeight: 28 },
});