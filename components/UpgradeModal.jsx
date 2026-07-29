import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

// Mirrors the website's paywallOverlay (core.js) — same 3 tiers, same
// copy. Shown whenever a free (or under-tier) user hits a plan limit.
// Usage: <UpgradeModal visible={show} message="..." onClose={...} onUpgrade={(planId) => ...} />
const PLANS = [
  {
    id: 'basic_manifestor_monthly',
    badge: 'Great to Start ✨',
    name: '🌱 Basic Manifestor',
    price: '$15',
    period: '/mo',
    note: 'Choose 1 voice at checkout · Locked for this plan',
    features: [
      '50 AI affirmations & 50 own affirmations/mo',
      '10 AI stories & 10 own stories/mo',
      '5 Mind Movies/mo',
      '1 voice of your choice — Luna, Orion, or Sage',
      'Vision Board & subliminal sessions',
      'Community wall posting',
    ],
  },
  {
    id: 'manifestor_monthly',
    badge: 'Most Popular ✨',
    name: '✨ Pro Manifestor',
    price: '$30',
    period: '/mo',
    featured: true,
    features: [
      'Unlimited affirmation reps & story plays',
      '100 AI affirmations & 20 AI stories/mo',
      'Mind Movies (10 active) & Vision Board (40 images)',
      'Unlimited subliminal sessions',
      'All 3 voices — Luna, Orion, Sage — switch anytime',
      'Unlimited desires, feel it cards & roadmaps',
      'Community wall posting',
      'Cloud storage, forever retention',
    ],
  },
  {
    id: 'founding_manifestor',
    badge: '👑 First 100 Only',
    name: '👑 Yearly Pro Manifestor',
    price: '$80',
    period: '/year',
    gold: true,
    note: 'One payment · Full year access · No recurring charge',
    features: [
      'Everything in Pro Manifestor',
      'Full year access — one payment',
      '100 AI affirmations & 20 AI stories/mo',
      'Mind Movies, Vision Board, Subliminals',
      'All 3 voices — Luna, Orion, Sage',
      'Founding Member badge forever 🌟',
      'Priority access to new features',
      'Cloud storage, forever retention',
    ],
  },
];

export default function UpgradeModal({ visible, message, onClose, onSelectPlan }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.emoji}>🌸</Text>
          <Text style={styles.title}>Unlock Manivers</Text>
          <Text style={styles.msg}>{message || 'Upgrade to access this feature and manifest without limits.'}</Text>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {PLANS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.plan, p.featured && styles.planFeatured, p.gold && styles.planGold]}
                onPress={() => onSelectPlan && onSelectPlan(p.id)}
              >
                <View style={[styles.planBadge, p.gold && styles.planBadgeGold]}>
                  <Text style={[styles.planBadgeText, p.gold && styles.planBadgeTextGold]}>{p.badge}</Text>
                </View>
                <Text style={[styles.planName, p.gold && styles.goldText]}>{p.name}</Text>
                <Text style={[styles.planPrice, p.gold && styles.goldText]}>
                  {p.price}<Text style={styles.planPeriod}>{p.period}</Text>
                </Text>
                {p.note ? <Text style={[styles.planNote, p.gold && styles.goldNote]}>{p.note}</Text> : null}
                {p.features.map((f, i) => (
                  <Text key={i} style={styles.feature}>✓ {f}</Text>
                ))}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.footNote}>Cancel anytime · Secure payment via Stripe</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,10,25,0.6)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fdf9fb', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 16, maxHeight: '85%' },
  closeBtn: { position: 'absolute', top: 14, right: 16, zIndex: 2, padding: 4 },
  closeBtnText: { fontSize: 20, color: '#6b5c66' },
  emoji: { fontSize: 30, textAlign: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '600', color: '#2e2530', textAlign: 'center', marginBottom: 6 },
  msg: { fontSize: 13, color: '#6b5c66', textAlign: 'center', marginBottom: 16, lineHeight: 19, paddingHorizontal: 10 },

  plan: { borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.35)', borderRadius: 16, padding: 14, marginBottom: 12, backgroundColor: '#fff' },
  planFeatured: { borderColor: '#9a5fa8', borderWidth: 2, backgroundColor: '#faf4fa' },
  planGold: { borderColor: '#e0c080', backgroundColor: '#fdf9f0' },
  planBadge: { alignSelf: 'flex-start', backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 3, paddingHorizontal: 10, marginBottom: 8 },
  planBadgeGold: { backgroundColor: '#c8a040' },
  planBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  planBadgeTextGold: { color: '#fff' },
  planName: { fontSize: 16, fontWeight: '600', color: '#2e2530', marginBottom: 2 },
  planPrice: { fontSize: 22, fontWeight: '700', color: '#2e2530', marginBottom: 4 },
  planPeriod: { fontSize: 13, fontWeight: '400', color: '#9a8896' },
  planNote: { fontSize: 11, color: '#9a5fa8', marginBottom: 8, fontStyle: 'italic' },
  goldText: { color: '#7a5000' },
  goldNote: { color: '#a07020' },
  feature: { fontSize: 12, color: '#4a4050', lineHeight: 20 },

  footNote: { fontSize: 11, color: '#9a8896', textAlign: 'center', marginTop: 12 },
});
