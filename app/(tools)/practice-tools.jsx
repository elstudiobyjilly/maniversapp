import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';

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

const TOOLS = [
  { key: 'bank-tool', label: 'Manifestation Bank', icon: 'wallet-outline', Component: BankTool },
  { key: 'roulette', label: 'Roulette', icon: 'sync-outline', Component: RouletteTool },
  { key: 'ritual-builder', label: 'Ritual Builder', icon: 'flower-outline', Component: RitualBuilderTool },
  { key: 'frequency-tuner', label: 'Frequency Tuner', icon: 'radio-outline', Component: FrequencyTunerTool },
  { key: 'spell-it', label: 'Spell It', icon: 'color-wand-outline', Component: SpellItTool },
  { key: 'auction', label: 'Desire Auction', icon: 'pricetags-outline', Component: AuctionTool },
  { key: 'moon-tracker', label: 'Moon Tracker', icon: 'moon-outline', Component: MoonTrackerTool },
  { key: 'beat-builder', label: 'Beat Builder', icon: 'musical-notes-outline', Component: BeatBuilderTool },
  { key: 'protection-bubble', label: 'Protection Bubble', icon: 'shield-checkmark-outline', Component: ProtectionBubbleTool },
  { key: 'identity-flip', label: 'Identity Flip', icon: 'swap-horizontal-outline', Component: IdentityFlipTool },
];

export default function PracticeTools() {
  // Accordion: only one section open at a time. Tools carry their own audio/
  // timers (frequency tuner, beat builder, protection bubble), so mounting
  // only the open one means collapsing a section actually stops its sound
  // instead of leaving it running in the background.
  const [expandedKey, setExpandedKey] = useState(TOOLS[0].key);

  const toggle = (key) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader lead="Practice" accent="Tools" subtitle="All 10 manifestation tools, one page ✨" />

        <GlassCard noPadding>
          {TOOLS.map((tool, i) => {
            const isOpen = expandedKey === tool.key;
            const isLast = i === TOOLS.length - 1;
            const ToolComponent = tool.Component;
            return (
              <View key={tool.key}>
                <TouchableOpacity style={styles.row} onPress={() => toggle(tool.key)}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={tool.icon} size={20} color="#9a5fa8" />
                  </View>
                  <Text style={styles.rowTitle}>{tool.label}</Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#9a8896" />
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.expandedWrap}>
                    <ToolComponent />
                  </View>
                )}

                {!isLast && <View style={styles.divider} />}
              </View>
            );
          })}
        </GlassCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 50, paddingBottom: 40 },

  title: { fontSize: 26, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500' },

  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#2e2530' },

  expandedWrap: { borderTopWidth: 1, borderTopColor: 'rgba(154,95,168,0.12)' },
  divider: { borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.12)' },
});