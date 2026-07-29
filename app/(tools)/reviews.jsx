import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { submitReview, getApprovedReviews } from '../../services/api';

export default function Reviews() {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const load = async () => {
    try { setApproved(await getApprovedReviews()); } catch (_) {}
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleSubmit = async () => {
    if (!text.trim()) { setError('Write your review.'); return; }
    setError(''); setSaving(true);
    try {
      await submitReview(text.trim(), rating);
      setSubmitted(true);
      setText('');
    } catch (e) {
      setError(e.message || 'Could not submit review');
    } finally { setSaving(false); }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <ScreenHeader lead="Re" accent="views" subtitle="Your words might be exactly what someone needs ✨" />

        {/* Submission card */}
        <GlassCard style={styles.mb20}>
          <Text style={styles.cardTitle}>Leave a Review</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setRating(n)}
                style={styles.starHit}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Text style={styles.star}>{n <= rating ? '⭐' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Tell us about your experience..."
            placeholderTextColor="#9a8896"
            value={text}
            onChangeText={setText}
            multiline
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {submitted && <Text style={styles.confirmedText}>Thank you! Pending approval ✨</Text>}
          <Button title="Submit Review ✨" onPress={handleSubmit} loading={saving} fullWidth />
        </GlassCard>

        {/* Approved reviews */}
        {loading ? (
          <ActivityIndicator color="#c9a8c9" style={{ marginTop: 20 }} />
        ) : approved.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to share your experience</Text>
          </GlassCard>
        ) : (
          <>
            <Text style={styles.sectionHeading}>What others are saying</Text>
            {approved.map((r) => (
              <GlassCard key={r.id} style={styles.reviewCard}>
                <Text style={styles.reviewStars}>{'⭐'.repeat(r.rating)}</Text>
                <Text style={styles.reviewText}>{r.text}</Text>
                <Text style={styles.reviewName}>— {r.name}</Text>
              </GlassCard>
            ))}
          </>
        )}

      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },

  screenTitle: { fontSize: 26, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  titleAccent: { color: '#9a5fa8', fontStyle: 'italic' },
  screenSubtitle: { fontSize: 13, color: '#6b5c66', fontWeight: '500', marginBottom: 20 },

  mb20: { marginBottom: 20 },

  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 12 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 14 },
  starHit: { paddingHorizontal: 4, paddingVertical: 4 },
  star: { fontSize: 30 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2e2530',
    minHeight: 80,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
    textAlignVertical: 'top',
  },
  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  confirmedText: { color: '#7da888', fontSize: 13, marginBottom: 10, textAlign: 'center', fontWeight: '600' },

  primaryBtn: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  sectionHeading: {
    fontSize: 11,
    color: '#9a5fa8',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  reviewCard: { marginBottom: 10 },
  reviewStars: { fontSize: 13, marginBottom: 6 },
  reviewText: { color: '#2e2530', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  reviewName: { color: '#9a8896', fontSize: 12 },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6b5c66' },
});
