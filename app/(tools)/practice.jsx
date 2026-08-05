import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPracticeChecks, savePracticeChecks, logPracticeSession } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import TabPill from '../../components/TabPill';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import { METHODS } from '../../constants/practiceContent';

import BankTool from '../../components/practice-tools/bank-tool';
import RouletteTool from '../../components/practice-tools/roulette';
import RitualBuilderTool from '../../components/practice-tools/ritual-builder';
import FrequencyTunerTool from '../../components/practice-tools/frequency-tuner';
import SpellItTool from '../../components/practice-tools/spell-it';
import AuctionTool from '../../components/practice-tools/auction';
import MoonTrackerTool from '../../components/practice-tools/moon-tracker';
import BeatBuilderTool from '../../components/practice-tools/beat-builder';
import ProtectionBubbleTool from '../../components/practice-tools/protection-bubble';
import IdentityFlipTool from '../../components/practice-tools/identity-flip';
import SynchronicityLogTool from '../../components/practice-tools/synchronicity-log';
import JournalPromptTool from '../../components/practice-tools/journal-prompt';
import AbundanceChequeTool from '../../components/practice-tools/abundance-cheque';

// ── Tools grouped into the site's 4 sub-tabs, in the order requested:
// Daily, Abundance, Frequency, Align.
const TOOL_SUBTABS = [
  {
    key: 'daily', label: '+ Daily',
    tools: [
      { key: 'roulette', label: '🎲 Manifestation Roulette', icon: 'sync-outline', Component: RouletteTool },
      { key: 'sync-log', label: '🌀 Synchronicity Log', icon: 'planet-outline', Component: SynchronicityLogTool },
      { key: 'journal', label: '📓 Journal Prompt', icon: 'book-outline', Component: JournalPromptTool },
      { key: 'cheque', label: '💸 Abundance Cheque', icon: 'cash-outline', Component: AbundanceChequeTool },
    ],
  },
  {
    key: 'abundance', label: '💰 Abundance',
    tools: [
      { key: 'bank-tool', label: 'Manifestation Bank', icon: 'wallet-outline', Component: BankTool },
      { key: 'auction', label: 'Desire Auction', icon: 'pricetags-outline', Component: AuctionTool },
      { key: 'spell-it', label: 'Spell It', icon: 'color-wand-outline', Component: SpellItTool },
    ],
  },
  {
    key: 'frequency', label: '📻 Frequency',
    tools: [
      { key: 'frequency-tuner', label: 'Frequency Tuner', icon: 'radio-outline', Component: FrequencyTunerTool },
      { key: 'beat-builder', label: 'Affirmation Beat', icon: 'musical-notes-outline', Component: BeatBuilderTool },
      { key: 'protection-bubble', label: 'Protection Bubble', icon: 'shield-checkmark-outline', Component: ProtectionBubbleTool },
    ],
  },
  {
    key: 'align', label: '🌙 Align',
    tools: [
      { key: 'moon-tracker', label: 'Moon Tracker', icon: 'moon-outline', Component: MoonTrackerTool },
      { key: 'ritual-builder', label: 'Desire Ritual Builder', icon: 'flower-outline', Component: RitualBuilderTool },
      { key: 'identity-flip', label: 'Identity Flip', icon: 'swap-horizontal-outline', Component: IdentityFlipTool },
    ],
  },
];

function MethodsPane() {
  const [checks, setChecks] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getPracticeChecks().then(setChecks).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleStep = async (methodName, stepIdx) => {
    const current = checks[methodName]?.[stepIdx] || false;
    const updated = { ...checks, [methodName]: { ...(checks[methodName] || {}), [stepIdx]: !current } };
    setChecks(updated);
    try { await savePracticeChecks(updated); } catch (_) {}
  };

  const handleLogSession = async (methodName) => {
    setLogging(methodName);
    try { await logPracticeSession(methodName); } catch (_) {}
    setLogging(null);
  };

  const doneCount = (methodName, totalSteps) => {
    const m = checks[methodName] || {};
    let c = 0;
    for (let i = 0; i < totalSteps; i++) if (m[i]) c++;
    return c;
  };

  const filtered = METHODS.filter((m) => m.name.toLowerCase().includes(search.trim().toLowerCase()));

  if (loading) return <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 40 }} />;

  return (
    <View>
      <TextInput
        style={styles.searchInput}
        placeholder="Search practices..."
        placeholderTextColor="rgba(46,37,48,0.4)"
        value={search}
        onChangeText={setSearch}
      />
      {filtered.map((method) => {
        const done = doneCount(method.name, method.steps.length);
        const isOpen = expanded === method.name;
        const complete = done === method.steps.length;
        return (
          <GlassCard key={method.name} style={{ marginBottom: 12 }}>
            <TouchableOpacity style={styles.methodHeader} onPress={() => setExpanded(isOpen ? null : method.name)}>
              <Text style={styles.methodIcon}>{method.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.progressText}>{done}/{method.steps.length} steps · {complete ? '✓ Complete' : 'In progress'}</Text>
              </View>
              <Button title="Practice" size="xs" onPress={() => setExpanded(isOpen ? null : method.name)} />
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.body}>
                <Text style={styles.bodyHint}>Tick each step as you complete it:</Text>
                {method.steps.map((step, i) => {
                  const checked = checks[method.name]?.[i] || false;
                  return (
                    <TouchableOpacity key={i} style={styles.stepRow} onPress={() => toggleStep(method.name, i)}>
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={[styles.stepText, checked && styles.stepTextDone]}>{step}</Text>
                    </TouchableOpacity>
                  );
                })}
                {complete && (
                  <TouchableOpacity style={styles.sessionButton} onPress={() => handleLogSession(method.name)} disabled={logging === method.name}>
                    {logging === method.name ? <ActivityIndicator color="#fff" /> : <Text style={styles.sessionButtonText}>✨ Start New Session</Text>}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </GlassCard>
        );
      })}
    </View>
  );
}

// Every tool in the active group renders as its own open panel, like the
// website — previously these were collapsed accordion rows that only
// allowed one tool open at a time, so you couldn't see what was available
// without tapping through each one.
function ToolsPane() {
  const [subTab, setSubTab] = useState('daily');
  const [collapsedKeys, setCollapsedKeys] = useState([]);
  const activeGroup = TOOL_SUBTABS.find((g) => g.key === subTab);

  const toggleCollapsed = (key) =>
    setCollapsedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <View>
      <View style={styles.subTabRow}>
        {TOOL_SUBTABS.map((g) => (
          <TouchableOpacity key={g.key} style={[styles.subTab, subTab === g.key && styles.subTabActive]} onPress={() => { setSubTab(g.key); setCollapsedKeys([]); }}>
            <Text style={[styles.subTabText, subTab === g.key && styles.subTabTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeGroup.tools.map((tool) => {
        // Open by default; the chevron only exists to tuck one away.
        const isOpen = !collapsedKeys.includes(tool.key);
        const ToolComponent = tool.Component;
        return (
          <GlassCard key={tool.key} noPadding style={styles.toolCard}>
            <TouchableOpacity style={styles.toolRow} onPress={() => toggleCollapsed(tool.key)}>
              <Text style={styles.toolLabel}>{tool.label}</Text>
              <Text style={styles.toolChevron}>{isOpen ? '▾' : '▸'}</Text>
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.toolExpandedWrap}>
                <ToolComponent />
              </View>
            )}
          </GlassCard>
        );
      })}
    </View>
  );
}

export default function Practice() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('methods');

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60 }]}>
        <ScreenHeader lead="Practice" accent="Methods" subtitle="Don't just read about techniques — actually do them. Track your practice. 🌟" />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'methods', label: '✨ Methods' },
            { value: 'tools', label: '🛠️ Tools' },
          ]}
        />

        {tab === 'methods' ? <MethodsPane /> : <ToolsPane />}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 50, paddingBottom: 40 },

  searchInput: {
    backgroundColor: '#fff', borderRadius: radii.pill, paddingVertical: 10, paddingHorizontal: 16,
    fontSize: 13.5, color: colors.ink, marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(248,184,200,0.35)',
  },

  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodIcon: { fontSize: 22 },
  methodName: { fontFamily: fonts.bodyMedium, fontSize: 14.5, fontWeight: '600', color: colors.ink },
  progressText: { fontFamily: fonts.body, fontSize: 10.5, color: colors.mist2, marginTop: 2 },

  body: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(46,37,48,0.08)' },
  bodyHint: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist, marginBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.purpleMid, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: colors.purpleMid },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 19 },
  stepTextDone: { color: colors.mist2, textDecorationLine: 'line-through' },
  sessionButton: { backgroundColor: colors.purpleMid, borderRadius: radii.pill, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  sessionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  subTabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  subTab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  subTabActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  subTabText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2, fontWeight: '600' },
  subTabTextActive: { color: '#fff', fontWeight: '700' },

  toolCard: { marginBottom: 12 },
  toolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  toolLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, fontWeight: '600', color: colors.ink },
  toolChevron: { fontSize: 13, color: colors.mist2 },
  toolExpandedWrap: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: 'rgba(154,95,168,0.12)', paddingTop: 14 },
});
