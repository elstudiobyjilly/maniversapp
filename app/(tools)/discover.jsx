import { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { getDiscoverPosts, getDiscoverGuides } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import TabPill from '../../components/TabPill';

const PAPER_GUIDES = [
  {
    id: 'welcome', title: 'Welcome to Manivers ✨', kicker: 'Start Here', icon: '🌸',
    body: `Manivers is your complete subconscious reprogramming app. Every feature here works together to shift your identity, rewire your beliefs, and help you manifest from a place of genuine alignment.

How to use Manivers daily:
The most powerful practice combines three things — feeling, repetition, and identity. Here is your simple daily flow:

① Morning — Open Affirmations. Generate or pick your set. Press play and let them run while you get ready. Feel each one land.

② During the day — Visit Feel It Cards. Read them slowly. Let the emotion build in your body — not just your mind.

③ Evening — Play a Subliminal session while you wind down, meditate, or sleep. This is when your subconscious is most receptive.

④ Weekly — Generate a new Story. Write in your Gratitude section. Use the practice tools to track your 369 method or moon ritual.

What makes Manivers different:
It works at the subconscious level. You're not just thinking positive thoughts — you are replacing old neural pathways with new ones through repetition, emotion and sound. The more consistently you use it, the faster your reality shifts.

Give it 30 days. ✨`,
  },
  {
    id: 'affirmations', title: 'How to Use Affirmations', kicker: 'Core Feature', icon: '✨',
    body: `Your affirmations are the foundation of everything in Manivers. Here is how to use them powerfully.

Generating Affirmations:
① Tap the Affirm section from the bottom nav
② Choose a desire from your list — or type one freely
③ Select your style: I Am (first person), You Are (second person — like a coach speaking to you), Background (gentle, ambient), Trance (deep, hypnotic), or Mix (variety)
④ Tap Generate
⑤ Play them immediately, or save to your library

Styles explained:
I Am — The most powerful. You are speaking as your future self. "I am wealthy. I am loved. I am healthy."
You Are — Feels like someone who believes in you completely is speaking to you. Deeply soothing.
Background — Softer affirmations designed to run in the background while you work or sleep.
Trance — Slow, deep, repetitive. Best for eyes-closed listening before sleep.
Mix — Randomly combines styles. Great for variety sessions.

Playing affirmations:
Press the play button on any affirmation set. Adjust speed and volume to your preference. The affirmations will cycle with audio from your chosen voice. Close your eyes and breathe — let each one register emotionally, not just mentally.

The secret: Repetition + emotion = reprogramming. Don't just hear the words. Feel them. Ask yourself: what would it feel like if this were already true? That feeling is your signal to the subconscious. ✨`,
  },
  {
    id: 'stories', title: 'How to Use Manifestation Stories', kicker: 'Immersive Practice', icon: '📖',
    body: `Stories are guided narrative meditations that place you inside your desired reality. Unlike affirmations, stories engage your imagination fully — and your subconscious cannot tell the difference between a vividly imagined experience and a real one.

Generating a Story:
① Go to the Stories section
② Pick a desire from your list
③ Choose a length (Short / Medium / Long)
④ Pick your style: I Am, You Are, Background, Trance, or Mix
⑤ Tap Generate Story

Listening to Stories:
Tap the play button on any saved story. The story will be read aloud sentence by sentence in your chosen voice. Tap the expand button for fullscreen mode — close your eyes and just listen.

For maximum effect:
Listen lying down with eyes closed. Use headphones. Don't analyse — just feel and visualise. Listen to the same story 7 times before switching. Repetition is the key. Stories are cached after first play — second play is instant ✨

Write Your Own:
Go to the Written tab inside Stories to write your own scripting story. Save it to your library and play it back with your chosen voice. This is one of the most powerful manifestation practices you can do. ✨`,
  },
  {
    id: 'subliminals', title: 'How to Use Subliminal Sessions', kicker: 'Deep Reprogramming', icon: '🎧',
    body: `Subliminals bypass the conscious mind entirely and speak directly to the subconscious. They work even when you are not actively listening — making them perfect for sleep, background work, or daily tasks.

Building a Subliminal Session:
① Pick Affirmations — choose from your sets, up to 15
② Choose Background — pick a music track or binaural beat frequency
③ Activate — set the mode, choose the voice, and begin

Audible vs Subliminal mode:
Audible — You can clearly hear the affirmations over the music. Subliminal — affirmations are embedded ultrasonically; you hear only music, but your subconscious receives them.

Binaural Beats:
Delta (2 Hz) — Deep sleep, healing. Theta (6 Hz) — Deep meditation. Alpha (10 Hz) — Calm focus. Beta (20 Hz) — Active motivation.

Best practice:
Create a session using your most emotionally charged affirmations. Play it every night while you sleep. Consistency over 30 days is where the real shift happens. ✨`,
  },
  {
    id: 'feelit', title: 'How to Use Feel It Cards', kicker: 'Emotional Activation', icon: '💫',
    body: `Feel It Cards are short, powerful written scenarios designed to produce the feeling of your desire already being real — right now, before the physical manifestation.

Why this matters: manifestation responds to frequency, not effort. Your subconscious uses your emotional state as a signal. When you genuinely feel "I already have this", your energy shifts.

How to use them:
① Choose a feeling state
② Read slowly. Don't rush.
③ When it hits — pause. Read it again. Breathe.
④ Close your eyes and inhabit the scenario fully.
⑤ Hold that feeling for 60 seconds minimum.

The "as if" state:
The goal is not to read the cards. The goal is to feel them. Even 30 seconds of genuine "as if" feeling is more powerful than an hour of affirmations said without emotion. ✨`,
  },
  {
    id: 'visionboard', title: 'How to Use Your Vision Board', kicker: 'Visual Programming', icon: '🖼️',
    body: `Your vision board inside Manivers is a living, interactive visual representation of your desired life.

Building your board:
① Tap + to add images
② Drag and resize each image to create your layout
③ Tap the lock icon to pin your most important visions

What images to use:
Don't just find pictures of things — find pictures that produce the feeling. A photo that makes you feel abundant is more powerful than a photo of cash.

The daily practice:
Open your vision board each morning. Spend 60 seconds looking at it — not just seeing it, but feeling it. Say quietly: "This is my life. I am so grateful." Then close it and move on. ✨`,
  },
  {
    id: 'gratitude', title: 'The Gratitude Practice', kicker: 'Daily Ritual', icon: '🙏',
    body: `Gratitude is the fastest frequency shifter in existence. When you are genuinely grateful, you are energetically positioned as someone who has received — and that is the exact state from which manifestation flows.

How to use Gratitude in Manivers:
① Each day, write a minimum of 5 things you are grateful for
② Be specific
③ Include things that haven't happened yet — write them as if they have

The quantum gratitude practice:
Write gratitude for the future as vividly as the present. Your subconscious processes both with equal weight.

Morning vs Evening:
Morning gratitude sets your vibrational frequency for the day. Evening gratitude anchors the good that happened. ✨`,
  },
  {
    id: 'practice', title: 'Practice Methods & Techniques', kicker: 'Manifestation Tools', icon: '🌟',
    body: `The Practice section contains active manifestation techniques — things you actually do, not just listen to. Consistency in one technique beats dabbling in many.

369 Method: Write your affirmation 3 times in the morning, 6 times in the afternoon, 9 times at night, for 33 consecutive days.

Scripting: Write a journal entry from the future — the day after your desire has manifested.

Moon Tracker: New Moon = plant desires. Full Moon = release what blocks them.

The rule of one: Pick ONE technique and commit to it for 30 days before evaluating. ✨`,
  },
  {
    id: 'subliminal_sets', title: 'Understanding Affirmation Sets', kicker: 'Library Management', icon: '📚',
    body: `Your Affirmation Sets are groups of affirmations organised by desire. Every time you generate affirmations for a desire, they're saved as a set in your library.

Pinning sets: Tap the pin icon on any set to keep it at the top of your library.

Keeping your library clean: Delete sets you no longer resonate with. Your subconscious works better with focused, aligned affirmations than a messy library of everything you've ever tried. Quality over quantity. ✨`,
  },
];

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
  { ic: '🔮', name: 'Future Self Journaling', tag: 'Daily', desc: 'Write diary entries as your future self who has already manifested everything. Date the entries in the future. Live in that frequency daily.', best: 'Every morning, 5-10 minutes', steps: ['Get a dedicated future self journal', 'Date every entry 1-5 years in the future', 'Begin: "Today I woke up feeling..."', 'Write your day as your future self would experience it', 'Be specific about your home, relationships, work, health, feelings', "Write what you're grateful for as that future self", "Finish by writing what you're looking forward to tomorrow"] },
  { ic: '🎵', name: 'Frequency Affirmations', tag: 'Audio', desc: 'Speak or listen to affirmations while playing 528Hz (love/miracle frequency) or 432Hz (natural harmony) music in the background.', best: 'During meditation, sleep, or anytime you are relaxed', steps: ['Search for 528Hz or 432Hz music', 'Play it at a low volume in the background', 'Speak or listen to your affirmations over the music', 'Relax your body completely — no tension', 'Let the sound and words wash over you', 'For sleep: play 528Hz overnight while your affirmations repeat', 'The combination of frequency and repetition is deeply powerful'] },
  { ic: '🌅', name: 'Morning Manifestation Ritual', tag: 'Daily', desc: 'The first 20 minutes after waking are your most powerful manifestation window. Your brain is still in theta wave state.', best: 'Every morning immediately upon waking', steps: ['Before checking your phone, take 10 deep breaths', 'Smile — even forced smiling shifts your neurochemistry', 'Say your top 3 desires aloud as if already real', 'Read your scripting journal or affirmation list', 'Spend 5 minutes visualising your desired life', 'Write 3 things you are grateful for', 'Set one aligned intention for the day'] },
  { ic: '🌙', name: 'Sleep Programming', tag: 'Bedtime', desc: 'Your subconscious is most receptive in the 20 minutes before sleep and the 20 minutes after waking. Feed it intentionally.', best: 'Every night as you fall asleep', steps: ['Stop consuming negative content 1 hour before bed', "Write in your gratitude journal — 5 things you're grateful for", 'Read your affirmations aloud softly', 'Play Manivers: set your affirmations to repeat while you sleep', 'As you drift off, replay your ideal life like a movie', 'Allow yourself to feel the joy of it being real', 'Trust your subconscious to work on it all night'] },
  { ic: '⭕', name: "Ho'oponopono", tag: 'Healing', desc: 'An ancient Hawaiian healing prayer used for clearing blocks, healing relationships and raising your vibration.', best: 'Whenever you feel resistance, fear, or blocking emotions', steps: ['Sit quietly and think of what you want to manifest', 'Notice any resistance, doubt or fear that arises', 'Say slowly, with feeling: "I\'m sorry"', 'Then: "Please forgive me"', 'Then: "Thank you"', 'Then: "I love you"', 'Repeat the four phrases for 5-10 minutes'] },
  { ic: '🌙', name: 'Night Routine Ritual', tag: 'Bedtime', desc: "A 3-part evening practice to close your day with intention and programme your subconscious as you sleep.", best: 'Every evening before bed', steps: ['Step 1 — Evening check-in: write what you\'re grateful for, today\'s win, and tomorrow\'s intention', 'Step 2 — Play your affirmations softly as you fall asleep', 'Step 3 — Write your affirmation 9 times before bed (369 Method)'] },
  { ic: '☀️', name: 'Morning Routine Ritual', tag: 'Daily', desc: "Start your day as your future self. A 3-step morning practice to set the frequency for everything that follows.", best: 'First thing every morning before checking your phone', steps: ['Step 1 — Read your daily future-self portrait aloud', 'Step 2 — Speak 3 affirmations aloud in your own voice', "Step 3 — Set today's intention"] },
];

export default function Discover() {
  const [tab, setTab] = useState('knowledge');
  const [posts, setPosts] = useState([]);
  const [guides, setGuides] = useState(PAPER_GUIDES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(null);
  const [techExpanded, setTechExpanded] = useState(null);

  const load = async () => {
    try {
      const [p, g] = await Promise.all([getDiscoverPosts(), getDiscoverGuides().catch(() => [])]);
      setPosts(p || []);
      const remoteGuides = (g || [])
        .filter((rg) => !PAPER_GUIDES.find((pg) => pg.id === String(rg.id)))
        .map((rg) => ({ id: String(rg.id), title: rg.title, kicker: 'Guide', icon: '📄', body: rg.body }));
      setGuides([...PAPER_GUIDES, ...remoteGuides]);
    } catch (e) {
      setError(e.message || 'Could not load discover content');
    }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <ScreenHeader lead="Dis" accent="cover" subtitle="Manifesting knowledge, wisdom & guides — curated with love." />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'knowledge', label: '📚 Knowledge' },
            { value: 'guide', label: '📄 Guide' },
            { value: 'techniques', label: '🌟 Techniques' },
          ]}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <Text style={styles.muted}>Loading...</Text>
        ) : tab === 'knowledge' ? (
          posts.length === 0 ? (
            <Text style={styles.muted}>No posts yet.</Text>
          ) : posts.map((p) => (
            <GlassCard key={p.id} style={{ marginBottom: 12 }}>
              {p.img_url ? <Image source={{ uri: p.img_url }} style={styles.postImage} /> : null}
              {p.tag ? <Text style={styles.tagLabel}>{p.tag}</Text> : null}
              {p.title ? <Text style={styles.postTitle}>{p.title}</Text> : null}
              <Text style={styles.postText}>{p.text}</Text>
            </GlassCard>
          ))
        ) : tab === 'guide' ? (
          <>
            <GlassCard style={{ marginBottom: 16, backgroundColor: 'rgba(46,37,48,0.04)' }}>
              <Text style={styles.manualKicker}>COMPLETE APP GUIDE</Text>
              <Text style={styles.manualTitle}>The Manivers Manual</Text>
              <Text style={styles.manualDesc}>How to use every feature to reprogram your subconscious, shift your identity, and manifest your reality — one practice at a time.</Text>
            </GlassCard>
            {guides.map((g) => (
              <TouchableOpacity key={g.id} onPress={() => setReading(g)}>
                <GlassCard style={{ marginBottom: 10 }} noPadding>
                  <View style={styles.guideRow}>
                    <Text style={styles.guideIcon}>{g.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guideKicker}>{g.kicker}</Text>
                      <Text style={styles.guideTitle}>{g.title}</Text>
                    </View>
                    <Text style={styles.guideChevron}>›</Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          TECHNIQUES.map((t, i) => {
            const isOpen = techExpanded === i;
            return (
              <GlassCard key={i} style={{ marginBottom: 12 }}>
                <TouchableOpacity style={styles.techHeader} onPress={() => setTechExpanded(isOpen ? null : i)}>
                  <Text style={styles.techIcon}>{t.ic}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.techName}>{t.name}</Text>
                    <Text style={styles.techTag}>{t.tag}</Text>
                  </View>
                  <Text style={styles.guideChevron}>{isOpen ? '▼' : '▶'}</Text>
                </TouchableOpacity>
                {isOpen && (
                  <View style={styles.techBody}>
                    <Text style={styles.techDesc}>{t.desc}</Text>
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
          })
        )}
      </ScrollView>

      <Modal visible={!!reading} animationType="slide">
        {reading && (
          <View style={styles.readerContainer}>
            <View style={styles.readerHeader}>
              <TouchableOpacity onPress={() => setReading(null)}>
                <Text style={styles.readerClose}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.readerHeaderTitle} numberOfLines={1}>{reading.title.replace(/[✨🌸]/g, '').trim()}</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={styles.readerScroll}>
              <Text style={styles.readerKicker}>{reading.kicker}</Text>
              <Text style={styles.readerTitle}>{reading.title}</Text>
              <View style={styles.readerDivider} />
              {reading.body.split('\n\n').map((para, i) => (
                <Text key={i} style={styles.readerParagraph}>{para}</Text>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 16, fontWeight: '500' },
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 50, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 50 },
  tabActive: { backgroundColor: '#2e2530' },
  tabText: { color: '#6b5c66', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  muted: { color: '#6b5c66', fontSize: 13, textAlign: 'center', marginTop: 10 },
  postImage: { width: '100%', height: 160, borderRadius: 12, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.3)' },
  tagLabel: { color: '#9a5fa8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  postTitle: { color: '#2e2530', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  postText: { color: '#2e2530', fontSize: 14, lineHeight: 20 },
  manualKicker: { fontSize: 10, color: '#9a5fa8', fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  manualTitle: { fontSize: 19, color: '#2e2530', fontWeight: '600', marginBottom: 6 },
  manualDesc: { fontSize: 13, color: '#6b5c66', lineHeight: 18 },
  guideRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  guideIcon: { fontSize: 22 },
  guideKicker: { fontSize: 10, color: '#9a5fa8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  guideTitle: { fontSize: 14, fontWeight: '600', color: '#2e2530' },
  guideChevron: { fontSize: 20, color: '#9a8896' },
  techHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  techIcon: { fontSize: 22 },
  techName: { fontSize: 14, fontWeight: '600', color: '#2e2530' },
  techTag: { fontSize: 11, color: '#9a5fa8', marginTop: 2 },
  techBody: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(46,37,48,0.08)' },
  techDesc: { fontSize: 13, color: '#2e2530', lineHeight: 19 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#c9a8c9', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  stepNumText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  stepText: { flex: 1, color: '#2e2530', fontSize: 13, lineHeight: 18 },
  bestTime: { fontSize: 12, color: '#9a5fa8', fontWeight: '600', marginTop: 6 },

  readerContainer: { flex: 1, backgroundColor: '#fffdf8' },
  readerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(46,37,48,0.08)' },
  readerClose: { fontSize: 18, color: '#2e2530', width: 24 },
  readerHeaderTitle: { fontSize: 13, color: '#6b5c66', fontWeight: '600', flex: 1, textAlign: 'center' },
  readerScroll: { paddingHorizontal: 28, paddingTop: 28, paddingBottom: 60 },
  readerKicker: { fontSize: 11, color: '#9a5fa8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  readerTitle: { fontSize: 26, color: '#2e2530', fontWeight: '700', textAlign: 'center', marginBottom: 18, fontFamily: 'serif' },
  readerDivider: { width: 50, height: 2, backgroundColor: '#c9a8c9', alignSelf: 'center', marginBottom: 24, borderRadius: 1 },
  readerParagraph: { fontSize: 17, color: '#2e2530', lineHeight: 28, marginBottom: 18, fontFamily: 'serif' },
});
