import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TECHNIQUES = [
  { ic: '3️⃣', name: '369 Method', tag: 'Writing', desc: "Write your affirmation 3 times in the morning, 6 times in the afternoon, and 9 times at night — for 33-45 days. Based on Nikola Tesla's belief that 3, 6 and 9 are the keys to the universe.", best: 'Morning, afternoon and evening — same time each day', steps: ['Write your affirmation 3× immediately upon waking', 'Write it 6× in the afternoon (lunch or 3pm)', 'Write it 9× before bed, feel the emotion as you write', 'Continue for 33 days minimum', 'Use present tense: "I am", "I have", "I feel"'] },
  { ic: '🥤', name: 'Two Cup Method', tag: 'Ritual', desc: 'A quantum jumping technique using water to shift your reality. Label one cup with your current situation and another with your desired reality. Pour the water while holding the feeling of your desire.', best: 'Once, when you need a powerful reality shift', steps: ['Fill two cups with water', 'Label one cup with your current situation', 'Label the other cup with your desire', 'Hold the first cup, feel your current reality fully', 'Slowly pour into the second cup while visualising the shift', 'Drink the water from the desire cup with full belief', 'Throw away or recycle the labels', 'Let go and trust'] },
  { ic: '📝', name: 'Scripting', tag: 'Writing', desc: 'Write in vivid detail as if your desire has already happened. Engage all your senses. This is one of the most powerful techniques because it tricks your subconscious into believing your desired reality is already true.', best: 'Morning or evening, 10-20 minutes', steps: ['Get a dedicated journal for scripting only', "Date your entry as if it's a future date when your desire has manifested", 'Write in past tense: "I am so happy and grateful now that..."', 'Include sensory details: what you see, hear, smell, touch, taste', 'Write how you FEEL — emotions are the magnet', 'End with genuine gratitude', 'Re-read your script before bed'] },
  { ic: '5️⃣', name: '5×55 Method', tag: 'Writing', desc: 'Write one powerful affirmation exactly 55 times for 5 consecutive days. The repetition creates a deep groove in your subconscious mind. The number 5 relates to change, and 55 amplifies it.', best: 'Same time each day, 5 days straight — no breaks', steps: ['Choose ONE single affirmation only', 'Write it 55 times in one sitting — by hand, not typed', 'Feel the emotion of the affirmation as you write each line', 'Do this for exactly 5 consecutive days', 'Do not skip a day — start again from day 1 if you do', 'After day 5, let go completely and trust the universe', 'Stay open to unexpected ways your desire arrives'] },
  { ic: '🪞', name: 'Mirror Work', tag: 'Practice', desc: 'Stand before a mirror, look deeply into your own eyes and speak affirmations aloud with love and conviction. Louise Hay called this the most powerful self-love technique in existence.', best: 'Morning after waking, 5-10 minutes', steps: ['Stand in front of a mirror — ideally a full-length one', 'Look directly into your own eyes, not at your face', 'Begin with "I love you, [your name]" — repeat until you believe it', 'Speak your affirmations aloud with conviction and emotion', 'Notice any resistance — breathe through it', 'End with "I love you and I believe in you"', 'Do this every morning for 30 days'] },
  { ic: '🌙', name: 'Pillow Method', tag: 'Bedtime', desc: 'Write your affirmation or desire on paper and sleep with it under your pillow. As you drift to sleep, your subconscious is most receptive. The last thought before sleep becomes your dominant frequency overnight.', best: 'Every night before sleep, until manifested', steps: ['Write your desire or affirmation clearly on a piece of paper', 'Before bed, hold the paper and read it aloud once', 'Feel the joy of it being real right now', 'Place the paper under your pillow', 'As you fall asleep, replay your desired reality like a movie', 'Do this every night — it works cumulatively', 'Change the paper when it feels right'] },
  { ic: '🎬', name: 'Visualisation', tag: 'Meditation', desc: 'Spend 10-15 minutes daily in a relaxed state vividly imagining your desire as already achieved. The brain cannot distinguish between a vividly imagined experience and a real one.', best: 'Morning before getting up, or just before sleep', steps: ['Find a quiet place and close your eyes', 'Take 10 deep breaths to reach a relaxed state', 'Imagine your desire as already real — in first person', 'Engage all 5 senses: see, hear, touch, smell, taste', 'Feel the emotions intensely — joy, gratitude, relief, excitement', 'Stay in the scene for 10-15 minutes', 'Open your eyes slowly and carry the feeling with you'] },
  { ic: '🙏', name: 'Gratitude Loop', tag: 'Daily', desc: 'Gratitude is the highest vibration state and instantly shifts your energy into a frequency where manifestation happens effortlessly.', best: 'Morning and evening, every day permanently', steps: ['Every morning write 10 things you are genuinely grateful for', 'For each one, feel the gratitude physically in your body', 'Include things not yet manifested', 'Every evening write 3 good things that happened today', 'Before bed say aloud: "Thank you for everything I have and everything coming"', 'The key is FEELING, not just listing', 'Over time gratitude becomes your natural state'] },
  { ic: '🌊', name: 'Water Manifestation', tag: 'Ritual', desc: "Water holds energy and intention — as demonstrated by Dr Masaru Emoto's research. Charge your drinking water with your intention and drink it consciously.", best: 'Every morning on an empty stomach', steps: ['Fill a glass with clean water the night before', 'Write your intention or affirmation on a piece of paper', 'Tape or place the paper under the glass overnight', 'In the morning, hold the glass with both hands', 'Close your eyes and speak your intention into the water three times', 'Feel the emotion of your desire as already real', 'Drink the water slowly and mindfully'] },
  { ic: '💌', name: 'Letter from Future Self', tag: 'Writing', desc: 'Write a letter to your current self from your future self — the version of you who has already manifested everything you desire.', best: 'Once a month, or whenever you need motivation', steps: ['Set a date 1-3 years in the future', 'Write "Dear [your name]," from your future self', 'Describe your life in the present tense as that future self', 'Share how you feel, what changed, what surprises you', 'Mention specific things you manifested', 'Give your current self encouragement and guidance', 'End with love — seal it, date it, and re-read it when needed'] },
  { ic: '🔮', name: 'Future Self Journaling', tag: 'Daily', desc: 'Write diary entries as your future self who has already manifested everything. Date the entries in the future. Live in that frequency daily.', best: 'Every morning, 5-10 minutes', steps: ['Get a dedicated future self journal', 'Date every entry 1-5 years in the future', 'Begin: "Today I woke up feeling..."', 'Write your day as your future self would experience it', 'Be specific about your home, relationships, work, health, feelings', 'Write what you\'re grateful for as that future self', "Finish by writing what you're looking forward to tomorrow"] },
  { ic: '🎵', name: 'Frequency Affirmations', tag: 'Audio', desc: 'Speak or listen to affirmations while playing 528Hz (love/miracle frequency) or 432Hz (natural harmony) music in the background.', best: 'During meditation, sleep, or anytime you are relaxed', steps: ['Search for 528Hz or 432Hz music', 'Play it at a low volume in the background', 'Speak or listen to your affirmations over the music', 'Relax your body completely — no tension', 'Let the sound and words wash over you', 'For sleep: play 528Hz overnight while your affirmations repeat', 'The combination of frequency and repetition is deeply powerful'] },
  { ic: '🌅', name: 'Morning Manifestation Ritual', tag: 'Daily', desc: 'The first 20 minutes after waking are your most powerful manifestation window. Your brain is still in theta wave state.', best: 'Every morning immediately upon waking', steps: ['Before checking your phone, take 10 deep breaths', 'Smile — even forced smiling shifts your neurochemistry', 'Say your top 3 desires aloud as if already real', 'Read your scripting journal or affirmation list', 'Spend 5 minutes visualising your desired life', 'Write 3 things you are grateful for', 'Set one aligned intention for the day'] },
  { ic: '🌙', name: 'Sleep Programming', tag: 'Bedtime', desc: 'Your subconscious is most receptive in the 20 minutes before sleep and the 20 minutes after waking. Feed it intentionally.', best: 'Every night as you fall asleep', steps: ['Stop consuming negative content 1 hour before bed', "Write in your gratitude journal — 5 things you're grateful for", 'Read your affirmations aloud softly', 'Play Manivers: set your affirmations to repeat while you sleep', 'As you drift off, replay your ideal life like a movie', 'Allow yourself to feel the joy of it being real', 'Trust your subconscious to work on it all night'] },
  { ic: '⭕', name: "Ho'oponopono", tag: 'Healing', desc: 'An ancient Hawaiian healing prayer used for clearing blocks, healing relationships and raising your vibration.', best: 'Whenever you feel resistance, fear, or blocking emotions', steps: ['Sit quietly and think of what you want to manifest', 'Notice any resistance, doubt or fear that arises', 'Say slowly, with feeling: "I\'m sorry"', 'Then: "Please forgive me"', 'Then: "Thank you"', 'Then: "I love you"', 'Repeat the four phrases for 5-10 minutes'] },
  { ic: '🌙', name: 'Night Routine Ritual', tag: 'Bedtime', desc: 'A 3-part evening practice to close your day with intention and programme your subconscious as you sleep: an evening check-in (gratitude, win, intention), playing soft sleep affirmations, and the 369 method before bed.', best: 'Every evening before bed', steps: ['Step 1 — Evening check-in: write what you\'re grateful for, today\'s win, and tomorrow\'s intention', 'Step 2 — Play your affirmations softly as you fall asleep', 'Step 3 — Write your affirmation 9 times before bed (369 Method)'] },
  { ic: '☀️', name: 'Morning Routine Ritual', tag: 'Daily', desc: "Start your day as your future self. A 3-step morning practice to set the frequency for everything that follows: reading your future self portrait, speaking affirmations aloud, and setting today's intention.", best: 'First thing every morning before checking your phone', steps: ['Step 1 — Read your daily future-self portrait aloud', 'Step 2 — Speak 3 affirmations aloud in your own voice', "Step 3 — Set today's intention"] },
];

export default function Techniques() {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(null);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 40 }}>
        <ScreenHeader lead="Manifestation" accent="Techniques" subtitle="17 proven techniques — pick one, commit, and watch it work." />

        {TECHNIQUES.map((t, i) => {
          const isOpen = expanded === i;
          return (
            <GlassCard key={i} style={{ marginBottom: 12 }}>
              <TouchableOpacity style={styles.header} onPress={() => setExpanded(isOpen ? null : i)}>
                <Text style={styles.icon}>{t.ic}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={styles.tag}>{t.tag}</Text>
                </View>
                <Text style={styles.chevron}>{isOpen ? '▼' : '▶'}</Text>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.body}>
                  <Text style={styles.desc}>{t.desc}</Text>
                  {t.steps?.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      {t.steps.map((s, j) => (
                        <View key={j} style={styles.stepRow}>
                          <View style={styles.stepNum}><Text style={styles.stepNumText}>{j + 1}</Text></View>
                          <Text style={styles.stepText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {t.best && <Text style={styles.bestTime}>⏰ Best time: {t.best}</Text>}
                </View>
              )}
            </GlassCard>
          );
        })}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 22 },
  name: { fontSize: 14, fontWeight: '600', color: '#2e2530' },
  tag: { fontSize: 11, color: '#9a5fa8', marginTop: 2 },
  chevron: { fontSize: 12, color: '#6b5c66' },
  body: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(46,37,48,0.08)' },
  desc: { fontSize: 13, color: '#2e2530', lineHeight: 19 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#c9a8c9', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  stepNumText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  stepText: { flex: 1, color: '#2e2530', fontSize: 13, lineHeight: 18 },
  bestTime: { fontSize: 12, color: '#9a5fa8', fontWeight: '600', marginTop: 6 },
});
