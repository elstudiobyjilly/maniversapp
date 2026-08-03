import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import GradientBackground from '../../components/GradientBackground';
import GlassCard from '../../components/GlassCard';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { dreamMapChat, saveDreamMap, createCheckout } from '../../services/api';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii } from '../../constants/theme';
import * as Linking from 'expo-linking';

const NODE_COLORS = ['#c9a8c9', '#8bb888', '#88b8b8', '#b8b888', '#b888a8'];

export default function DreamMap() {
  const { loaded, isPaid, refresh } = usePlanStore();
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Let's build a map of your dream life ✨ Tell me — what does your ideal life look like? Start anywhere: career, love, home, how you feel each day..." },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { refresh().finally(() => setCheckingPlan(false)); }, []);

  const handleSelectPlan = async (priceKey) => {
    try {
      const res = await createCheckout(priceKey);
      if (res?.url) await Linking.openURL(res.url);
    } catch (_) {}
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const history = nextMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const r = await dreamMapChat(text, history);
      const reply = r.reply || r.message || r.content || '...';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      if (Array.isArray(r.nodes) && r.nodes.length) setNodes(r.nodes);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again ✨' }]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const raw = messages.map((m) => `${m.role === 'user' ? 'You' : 'Manivers'}: ${m.content}`).join('\n');
      await saveDreamMap({ title: 'My Dream Map ' + new Date().toLocaleDateString(), nodes, raw_conversation: raw });
      Alert.alert('Dream Map saved 🌟');
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  if (checkingPlan) {
    return <GradientBackground><View style={styles.center}><ActivityIndicator size="large" color="#c9a8c9" /></View></GradientBackground>;
  }

  if (loaded && !isPaid()) {
    return (
      <GradientBackground>
        <View style={styles.upsellWrap}>
          <Text style={styles.upsellIcon}>🌟</Text>
          <ScreenHeader lead="Dream" accent="Map" subtitle="Talk it out — watch your dream life take shape as a visual map." style={{ alignItems: 'center', marginBottom: 20 }} />
          <View style={styles.upsellPerks}>
            <Text style={styles.upsellPerk}>✓ A guided AI conversation about your ideal life</Text>
            <Text style={styles.upsellPerk}>✓ Your answers become a visual dream map</Text>
            <Text style={styles.upsellPerk}>✓ Save and revisit your map anytime</Text>
          </View>
          <Button title="Upgrade to Unlock ✨" onPress={() => setShowUpgrade(true)} />
        </View>
        <UpgradeModal
          visible={showUpgrade}
          message="Dream Map requires a paid plan ✨"
          onClose={() => setShowUpgrade(false)}
          onSelectPlan={handleSelectPlan}
        />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={{ paddingTop: 50, paddingHorizontal: 16 }}>
          <ScreenHeader lead="Dream" accent="Map" subtitle="Talk it out — watch your dream life take shape ✨" />
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
              <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>{m.content}</Text>
            </View>
          ))}
          {sending && (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <ActivityIndicator size="small" color="#9a5fa8" />
            </View>
          )}

          {nodes.length > 0 && (
            <GlassCard style={{ marginTop: 12 }}>
              <Text style={styles.mapTitle}>🌟 My Dream Life</Text>
              <View style={styles.nodeGrid}>
                {nodes.map((n, i) => (
                  <View key={i} style={[styles.nodeCard, { borderColor: NODE_COLORS[i % NODE_COLORS.length] }]}>
                    <Text style={styles.nodeEmoji}>{n.emoji || '✨'}</Text>
                    <Text style={styles.nodeTitle}>{n.title || n.name || String(n)}</Text>
                    {n.description ? <Text style={styles.nodeDesc}>{n.description}</Text> : null}
                  </View>
                ))}
              </View>
              <Button title="💾 Save Dream Map" onPress={handleSave} loading={saving} fullWidth style={{ marginTop: 14 }} />
            </GlassCard>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="Tell me about your dream life..."
              placeholderTextColor="rgba(46,37,48,0.4)"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              multiline
            />
          </View>
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  upsellWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 60 },
  upsellIcon: { fontSize: 44, marginBottom: 10 },
  upsellPerks: { alignSelf: 'stretch', marginBottom: 24 },
  upsellPerk: { fontFamily: fonts.body, fontSize: 13, color: colors.ink2, marginBottom: 8, textAlign: 'center' },

  bubble: { maxWidth: '85%', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#c9a8c9', borderBottomRightRadius: 4 },
  bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
  bubbleTextUser: { color: '#fff' },

  mapTitle: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink, textAlign: 'center', marginBottom: 12 },
  nodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nodeCard: { width: '31%', borderWidth: 1.5, borderRadius: 14, padding: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)' },
  nodeEmoji: { fontSize: 20, marginBottom: 4 },
  nodeTitle: { fontFamily: fonts.bodyMedium, fontSize: 11.5, fontWeight: '600', color: colors.ink, textAlign: 'center' },
  nodeDesc: { fontFamily: fonts.body, fontSize: 9.5, color: colors.mist, textAlign: 'center', marginTop: 3 },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, paddingTop: 8 },
  inputBox: { flex: 1, borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.7)', maxHeight: 100 },
  input: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#c9a8c9', alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
