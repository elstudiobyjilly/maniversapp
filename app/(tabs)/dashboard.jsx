import { Children, useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../../store/authStore';
import { usePlanStore } from '../../store/planStore';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import Button from '../../components/Button';
import { AuraCardFace } from '../../components/AuraCardCanvas';
import { colors, fonts, gradients, radii } from '../../constants/theme';
import { categoryLabel } from '../../constants/desires';
import { DAILY_MESSAGES } from '../../constants/dailyContent';
import { AURA_AFFIRMATIONS, PATTERNS, PATTERN_LABELS, detectStyle } from '../../constants/auraCard';
import {
  START_KEY_PREFIX, toDateKey, addDays, buildLogsMap, dayNumberFor,
} from '../../constants/desireAction';
import {
  getDesires, getGratitudeList, addGratitude,
  getRoadmaps, getRoadmapDayLogs, createRoadmapDayLog, deleteRoadmapDayLog,
  getMindMovies, getSubSessions, getManifested, addManifested,
} from '../../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
// The layout sketch pairs widgets two-across. That's how it renders on a
// tablet; on a phone there isn't room for two write-boxes side by side, so
// pairs stack — the running ORDER stays identical either way.
const IS_WIDE = SCREEN_WIDTH >= 600;

// "Big boxes" per the sketch — desire cards are roughly half the screen wide
// with a tall cover, rather than the old small 150px thumbnails.
const DESIRE_CARD_W = Math.min(220, SCREEN_WIDTH * 0.56);
const DESIRE_CARD_H = DESIRE_CARD_W * 0.72 + 64;
const DESIRE_ROWS = 2;
const DESIRE_ROW_GAP = 12;
const AURA_PREVIEW = Math.min((IS_WIDE ? SCREEN_WIDTH / 2 : SCREEN_WIDTH) - 96, 300);

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

// Lays its two children side by side on wide screens, stacked on phones.
function PairRow({ children }) {
  const items = Children.toArray(children);
  if (!IS_WIDE) return <>{items}</>;
  return (
    <View style={styles.pairRow}>
      {items.map((c, i) => <View key={i} style={{ flex: 1 }}>{c}</View>)}
    </View>
  );
}

// ─── Shared widget shell: big glass box with a title row + "open" chevron ──
function Widget({ icon, title, onOpen, openLabel = 'Open', children, style }) {
  return (
    <GlassCard style={[styles.widget, style]}>
      <View style={styles.widgetHead}>
        <Text style={styles.widgetTitle}>{icon} {title}</Text>
        {onOpen ? (
          <TouchableOpacity onPress={onOpen} hitSlop={8}>
            <Text style={styles.widgetOpen}>{openLabel} ›</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </GlassCard>
  );
}

function WriteBox({ value, onChangeText, placeholder, minHeight = 84 }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.writeBox, { minHeight }, focused && styles.writeBoxFocused]}>
      <TextInput
        style={styles.writeInput}
        placeholder={placeholder}
        placeholderTextColor="rgba(46,37,48,0.4)"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

// ─── 🙏 Gratitude — write box + today's entries ───────────────────────────
function GratitudeWidget({ router, entries, onSaved }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const todayKey = new Date().toDateString();
  const todays = (entries || []).filter((e) => new Date(e.created_at).toDateString() === todayKey);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const row = await addGratitude(text.trim());
      setText('');
      onSaved(row);
    } catch (_) {} finally { setSaving(false); }
  };

  return (
    <Widget icon="🙏" title="Gratitude Entry" onOpen={() => router.push('/gratitude')}>
      <WriteBox value={text} onChangeText={setText} placeholder="I am grateful for..." />
      <Button title="Save ✨" size="sm" onPress={save} loading={saving} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      <Text style={styles.widgetSubLabel}>TODAY'S ENTRIES</Text>
      {todays.length === 0 ? (
        <Text style={styles.widgetEmpty}>Nothing yet today — start with one small thing 🌸</Text>
      ) : (
        todays.slice(0, 4).map((e) => (
          <View key={e.id} style={styles.listLine}>
            <Text style={styles.listDot}>·</Text>
            <Text style={styles.listText} numberOfLines={2}>{e.content}</Text>
          </View>
        ))
      )}
    </Widget>
  );
}

// ─── 🗺️ Desire Action — pick a desire, tick today's practices, write a note ─
function DesireActionWidget({ router, roadmaps, rawLogs, setRawLogs }) {
  const [activeId, setActiveId] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const active = roadmaps.find((r) => r.id === activeId) || roadmaps[0] || null;
  const todayKey = toDateKey(new Date());
  const logs = active ? buildLogsMap(rawLogs, active.title) : {};
  const todayLog = logs[todayKey];

  useEffect(() => { setNote(todayLog?.note || ''); }, [active?.id, todayLog?.id]);

  // A day log has no PATCH on the backend — saving means replacing the row.
  const writeDay = async (practices, noteText) => {
    if (!active || busy) return;
    setBusy(true);
    try {
      if (todayLog?.id) { try { await deleteRoadmapDayLog(todayLog.id); } catch (_) {} }
      const created = await createRoadmapDayLog({
        day: dayNumberFor(todayKey, active.startDate),
        desire: active.title,
        practices: Object.keys(practices).filter((p) => practices[p]),
        action: noteText || '',
        date: todayKey,
      });
      setRawLogs((cur) => [...cur.filter((l) => !(todayLog?.id && l.id === todayLog.id)), created]);
    } catch (_) {} finally { setBusy(false); }
  };

  const toggle = (p) => {
    const cur = todayLog?.practices || {};
    writeDay({ ...cur, [p]: !cur[p] }, todayLog?.note ?? note);
  };

  if (!roadmaps.length) {
    return (
      <Widget icon="🗺️" title="Desire Action" onOpen={() => router.push('/desire-action')} openLabel="Start">
        <Text style={styles.widgetEmpty}>No tracker running yet — pick a desire and your daily practices ✨</Text>
        <Button title="＋ Start a tracker" size="sm" onPress={() => router.push('/desire-action')} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      </Widget>
    );
  }

  return (
    <Widget icon="🗺️" title="Desire Action" onOpen={() => router.push('/desire-action')}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {roadmaps.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.desirePill, active?.id === r.id && styles.desirePillOn]}
            onPress={() => setActiveId(r.id)}
          >
            <Text style={[styles.desirePillText, active?.id === r.id && styles.desirePillTextOn]} numberOfLines={1}>{r.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.widgetSubLabel}>TODAY'S CHECKLIST</Text>
      {(active?.practices || []).length === 0 ? (
        <Text style={styles.widgetEmpty}>No practices set for this desire.</Text>
      ) : (
        active.practices.map((p) => {
          const done = !!todayLog?.practices?.[p];
          return (
            <TouchableOpacity key={p} style={styles.checkRow} onPress={() => toggle(p)} disabled={busy}>
              <View style={[styles.checkbox, done && styles.checkboxOn]}>{done && <Text style={styles.checkTick}>✓</Text>}</View>
              <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>{p}</Text>
            </TouchableOpacity>
          );
        })
      )}

      <Text style={styles.widgetSubLabel}>ACTION / NOTE</Text>
      <WriteBox value={note} onChangeText={setNote} placeholder="What action did you take today?" minHeight={70} />
      <Button
        title="Save note"
        size="sm"
        onPress={() => writeDay(todayLog?.practices || {}, note)}
        loading={busy}
        variant="ghost"
        style={{ marginTop: 10, alignSelf: 'flex-start' }}
      />
    </Widget>
  );
}

// ─── 🎬 Mind Movies — thumbnail grid ──────────────────────────────────────
function MindMovieWidget({ router, movies }) {
  const shown = (movies || []).slice(0, 4);
  return (
    <Widget icon="🎬" title="Mind Movies" onOpen={() => router.push('/mindmovie')} openLabel="All">
      {shown.length === 0 ? (
        <>
          <Text style={styles.widgetEmpty}>No movies yet — turn your dream life into a film 🎬</Text>
          <Button title="＋ New movie" size="sm" onPress={() => router.push('/mindmovie')} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
        </>
      ) : (
        <View style={styles.tileGrid}>
          {shown.map((m) => (
            <TouchableOpacity key={m.id} style={styles.movieTile} onPress={() => router.push('/mindmovie')}>
              {m.scenes?.[0]?.img ? (
                <Image source={{ uri: m.scenes[0].img }} style={styles.movieThumb} />
              ) : (
                <LinearGradient colors={gradients.avatar} style={styles.movieThumb} />
              )}
              <Text style={styles.movieTitle} numberOfLines={1}>{m.locked ? '🔒 ' : ''}{m.title || 'Untitled'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Widget>
  );
}

// ─── 🎧 Subliminal — saved sessions, tap to play in the Station ───────────
function SubliminalWidget({ router, sessions, locked }) {
  return (
    <Widget icon="🎧" title="Subliminals" onOpen={() => router.push('/subliminal')} openLabel="Station">
      {locked ? (
        <Text style={styles.widgetEmpty}>Custom subliminals are a Basic Manifestor feature — the sample tracks are free to play in the Station ✨</Text>
      ) : (sessions || []).length === 0 ? (
        <>
          <Text style={styles.widgetEmpty}>No sessions yet — build one from your affirmations 🎧</Text>
          <Button title="＋ New session" size="sm" onPress={() => router.push('/subliminal')} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
        </>
      ) : (
        <View style={styles.tileGrid}>
          {sessions.slice(0, 4).map((s) => (
            <TouchableOpacity key={s.id} style={styles.subTile} onPress={() => router.push('/subliminal')}>
              <Text style={styles.subTilePlay}>▶</Text>
              <Text style={styles.subTileTitle} numberOfLines={1}>
                {s.label || s.audio_items?.[0]?.desire || 'Session'}
              </Text>
              <Text style={styles.subTileMeta}>{s.aff_count || 0} affs · {s.session_mins || 20}m</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Widget>
  );
}

// ─── ☀️ Message for the day ───────────────────────────────────────────────
function DailyWidget({ router }) {
  const msg = DAILY_MESSAGES[dayOfYear(new Date()) % DAILY_MESSAGES.length];
  return (
    <Widget icon="☀️" title="Message for the Day" onOpen={() => router.push('/daily')} openLabel="Daily">
      <Text style={styles.dailyMsg}>"{msg}"</Text>
    </Widget>
  );
}

// ─── 🏆 Manifested — quick win entry ──────────────────────────────────────
function ManifestedWidget({ router, wins, onSaved }) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const row = await addManifested({ title: title.trim() });
      setTitle('');
      onSaved(row);
    } catch (_) {} finally { setSaving(false); }
  };

  return (
    <Widget icon="🏆" title="Manifested" onOpen={() => router.push('/manifested')} openLabel="All">
      <WriteBox value={title} onChangeText={setTitle} placeholder="What just manifested for you? 🎉" minHeight={70} />
      <Button title="Log it 🎉" size="sm" onPress={save} loading={saving} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      {(wins || []).length > 0 && (
        <>
          <Text style={styles.widgetSubLabel}>RECENT WINS</Text>
          {wins.slice(0, 3).map((w) => (
            <View key={w.id} style={styles.listLine}>
              <Text style={styles.listDot}>🎉</Text>
              <Text style={styles.listText} numberOfLines={1}>{w.title}</Text>
            </View>
          ))}
        </>
      )}
    </Widget>
  );
}

// ─── 🎴 Aura Card — make one right here ───────────────────────────────────
function AuraCardWidget({ router }) {
  const [pattern, setPattern] = useState('radial');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const cardRef = useRef(null);

  const styleKey = detectStyle('aura');
  const quote = AURA_AFFIRMATIONS[dayOfYear(new Date()) % AURA_AFFIRMATIONS.length];
  const colours = { purple: true, pink: true, blue: true, gold: true };

  const capture = async (mode) => {
    setBusy(true); setInfo('');
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (mode === 'save') {
        const { granted } = await MediaLibrary.requestPermissionsAsync();
        if (!granted) { setInfo('Photo permission needed to save.'); return; }
        await MediaLibrary.saveToLibraryAsync(uri);
        setInfo('Saved to your photos ✨');
        setTimeout(() => setInfo(''), 3000);
      } else {
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      }
    } catch (_) { setInfo('Could not create the image.'); } finally { setBusy(false); }
  };

  return (
    <Widget icon="🎴" title="Aura Card" onOpen={() => router.push('/aura-card')} openLabel="Customise">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {PATTERNS.map((p) => (
          <TouchableOpacity key={p} style={[styles.patPill, pattern === p && styles.patPillOn]} onPress={() => setPattern(p)}>
            <Text style={[styles.patPillText, pattern === p && styles.patPillTextOn]}>{PATTERN_LABELS[p]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.auraWrap}>
        <AuraCardFace
          innerRef={cardRef}
          styleKey={styleKey}
          size={AURA_PREVIEW}
          pattern={pattern}
          colours={colours}
          quote={quote}
        />
      </View>

      {info ? <Text style={styles.infoText}>{info}</Text> : null}
      <View style={styles.auraBtnRow}>
        <Button title="⬇️ Download" size="sm" variant="ghost" onPress={() => capture('save')} loading={busy} />
        <Button title="🔗 Share" size="sm" variant="ghost" onPress={() => capture('share')} />
      </View>
    </Widget>
  );
}

// ─── Plain shortcut tiles for the tools with no inline surface ────────────
function ShortcutRow({ items, router }) {
  return (
    <View style={styles.shortcutRow}>
      {items.map((item) => (
        <TouchableOpacity key={item.route} style={styles.shortcutTile} onPress={() => router.push(item.route)}>
          <Text style={styles.shortcutIcon}>{item.icon}</Text>
          <Text style={styles.shortcutLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { plan, refresh: refreshPlan } = usePlanStore();

  const [desires, setDesires] = useState([]);
  const [gratitude, setGratitude] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [movies, setMovies] = useState([]);
  const [subs, setSubs] = useState([]);
  const [subsLocked, setSubsLocked] = useState(false);
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    refreshPlan();
    // Every widget is independent — one failing endpoint must never blank
    // the whole home screen, so each is settled on its own.
    const results = await Promise.allSettled([
      getDesires(), getGratitudeList(30), getRoadmaps(), getRoadmapDayLogs(),
      getMindMovies(), getSubSessions(), getManifested(),
    ]);
    const [d, g, rm, rl, mm, sb, mf] = results;

    if (d.status === 'fulfilled') setDesires(Array.isArray(d.value) ? d.value : []);
    if (g.status === 'fulfilled') setGratitude(Array.isArray(g.value) ? g.value : []);
    if (rl.status === 'fulfilled') setRawLogs(Array.isArray(rl.value) ? rl.value : []);
    if (mm.status === 'fulfilled') setMovies(Array.isArray(mm.value) ? mm.value : []);
    if (mf.status === 'fulfilled') setWins(Array.isArray(mf.value) ? mf.value : []);

    // Subliminal sessions 403 on the free plan — that's a lock, not an error.
    if (sb.status === 'fulfilled') { setSubs(Array.isArray(sb.value) ? sb.value : []); setSubsLocked(false); }
    else setSubsLocked(sb.reason?.status === 403);

    // Roadmaps need their locally-stored calendar anchor to resolve "today".
    if (rm.status === 'fulfilled' && Array.isArray(rm.value)) {
      const withStart = await Promise.all(rm.value.map(async (r) => {
        let startDate = null;
        try { startDate = await AsyncStorage.getItem(START_KEY_PREFIX + r.id); } catch (_) {}
        if (!startDate) startDate = (r.created_at || '').slice(0, 10) || toDateKey(new Date());
        return {
          id: r.id,
          title: r.desire,
          days: r.days,
          practices: r.practices || [],
          startDate,
          endDate: toDateKey(addDays(new Date(startDate), (r.days || 21) - 1)),
        };
      }));
      setRoadmaps(withStart);
    }
  }, [refreshPlan]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const planLabel = `${(user?.plan || plan || 'free').toUpperCase()} · ${user?.plan_status || 'active'}`;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purpleMid} />}
      >
        <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
          <Text style={styles.greeting}>
            Welcome, <Text style={styles.greetingAccent}>{user?.full_name?.split(' ')[0] || user?.username}</Text> 🌸
          </Text>
          <Text style={styles.planBadge}>{planLabel}</Text>
        </View>

        {/* ── My Desire Hub — big cover cards ── */}
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionHeading}>My Desire Hub</Text>
          <TouchableOpacity onPress={() => router.push('/desire-hub')} hitSlop={8}>
            <Text style={styles.seeAllLink}>See All ›</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.purpleMid} style={{ marginBottom: 20 }} />
        ) : desires.length === 0 ? (
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.emptyLead}>No desires yet ✨</Text>
            <Text style={styles.emptyBody}>Name what you're calling in — everything else in Manivers can link back to it.</Text>
            <Button title="＋ New Desire" size="sm" onPress={() => router.push('/desire-hub')} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
          </GlassCard>
        ) : (
          // Two rows of big cards that scroll sideways together — column-wrap
          // inside a fixed-height track is what gives the 2-row grid.
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
            <View style={styles.desireTrack}>
              {desires.slice(0, 10).map((d) => (
                <TouchableOpacity key={d.id} style={styles.desireCard} onPress={() => router.push(`/desire/${d.id}`)}>
                  {d.images?.[0] ? (
                    <Image source={{ uri: d.images[0] }} style={styles.desireCover} />
                  ) : (
                    <LinearGradient colors={gradients.avatar} style={styles.desireCover} />
                  )}
                  <View style={styles.desireBody}>
                    <Text style={styles.desireTitle} numberOfLines={1}>{d.title}</Text>
                    {d.category ? <Text style={styles.desireCategory}>{categoryLabel(d.category)}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.desireCard, styles.desireAddCard]} onPress={() => router.push('/desire-hub')}>
                <Text style={styles.desireAddIcon}>＋</Text>
                <Text style={styles.desireAddText}>New Desire</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Order follows the home layout sketch exactly:
            desires → gratitude + desire action → mind movies + subliminal →
            feel it / meditate / tools → daily + manifested → community +
            read → aura card. */}
        <View style={styles.widgetsWrap}>
          <PairRow>
            <GratitudeWidget
              router={router}
              entries={gratitude}
              onSaved={(row) => setGratitude((prev) => [row, ...prev])}
            />
            <DesireActionWidget router={router} roadmaps={roadmaps} rawLogs={rawLogs} setRawLogs={setRawLogs} />
          </PairRow>

          <PairRow>
            <MindMovieWidget router={router} movies={movies} />
            <SubliminalWidget router={router} sessions={subs} locked={subsLocked} />
          </PairRow>

          <ShortcutRow router={router} items={[
            { icon: '💫', label: 'Feel It', route: '/feelit' },
            { icon: '🧘', label: 'Meditate', route: '/meditate' },
            { icon: '🧰', label: 'Tools', route: '/practice' },
          ]} />

          <PairRow>
            <DailyWidget router={router} />
            <ManifestedWidget router={router} wins={wins} onSaved={(row) => setWins((prev) => [row, ...prev])} />
          </PairRow>

          <ShortcutRow router={router} items={[
            { icon: '🌸', label: 'Community', route: '/community' },
            { icon: '📖', label: 'Read', route: '/discover' },
          ]} />

          <AuraCardWidget router={router} />
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { padding: 24, alignItems: 'center' },
  greeting: { fontFamily: fonts.display, fontSize: 25, color: colors.ink, marginBottom: 6, textAlign: 'center', fontWeight: '400' },
  greetingAccent: { fontFamily: fonts.displayItalic, color: colors.purpleDark, fontWeight: '500', fontStyle: 'italic' },
  planBadge: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.mist, letterSpacing: 1.4 },

  sectionHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionHeading: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ink, fontWeight: '600' },
  seeAllLink: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, fontWeight: '600' },

  cardMargin: { marginHorizontal: 20, marginBottom: 20 },
  emptyLead: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink },
  emptyBody: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, lineHeight: 19, marginTop: 6 },

  // Big desire cards, laid out as two sideways-scrolling rows
  desireTrack: {
    // Column-wrap in a fixed-height track: cards fill row 1, wrap to row 2,
    // then start a new column. rowGap spaces the two rows; the cards' own
    // marginRight spaces the columns.
    flexDirection: 'column', flexWrap: 'wrap', rowGap: DESIRE_ROW_GAP,
    height: DESIRE_CARD_H * DESIRE_ROWS + DESIRE_ROW_GAP,
    alignContent: 'flex-start',
  },
  desireCard: {
    width: DESIRE_CARD_W, height: DESIRE_CARD_H, marginRight: DESIRE_ROW_GAP,
    backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.md, overflow: 'hidden',
  },
  desireCover: { width: '100%', height: DESIRE_CARD_W * 0.72 },
  desireBody: { padding: 12 },
  desireTitle: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.ink, fontWeight: '600' },
  desireCategory: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, marginTop: 3 },
  desireAddCard: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(201,168,201,0.5)',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.3)',
  },
  desireAddIcon: { fontSize: 26, color: colors.purpleDark, marginBottom: 4 },
  desireAddText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, fontWeight: '600' },

  // Widget shell
  widgetsWrap: { paddingHorizontal: 20, gap: 14 },
  pairRow: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  widget: { padding: 18 },
  widgetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  widgetTitle: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink, fontWeight: '600' },
  widgetOpen: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, fontWeight: '600' },
  widgetSubLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  widgetEmpty: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, lineHeight: 19 },

  writeBox: {
    borderWidth: 1.5, borderColor: 'rgba(248,184,200,0.35)', borderRadius: radii.md,
    paddingVertical: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.9)',
  },
  writeBoxFocused: {
    borderWidth: 2, borderColor: colors.pinkAccent, shadowColor: colors.pinkAccent,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6,
  },
  writeInput: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, flex: 1, lineHeight: 21 },

  listLine: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 7 },
  listDot: { fontFamily: fonts.body, fontSize: 12, color: colors.purpleDark },
  listText: { flex: 1, fontFamily: fonts.body, fontSize: 12.5, color: colors.ink2, lineHeight: 18 },

  pillRow: { gap: 6, paddingBottom: 2 },
  desirePill: {
    paddingVertical: 7, paddingHorizontal: 13, borderRadius: radii.pill, borderWidth: 1.5,
    borderColor: 'rgba(201,168,201,0.4)', backgroundColor: 'rgba(255,255,255,0.7)', maxWidth: 180,
  },
  desirePillOn: { backgroundColor: colors.purpleMid, borderColor: 'transparent' },
  desirePillText: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, fontStyle: 'italic' },
  desirePillTextOn: { color: '#fff' },

  patPill: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.25)', backgroundColor: 'rgba(255,255,255,0.6)',
  },
  patPillOn: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  patPillText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.ink2 },
  patPillTextOn: { color: '#fff', fontWeight: '700' },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.purpleDark, borderColor: colors.purpleDark },
  checkTick: { color: '#fff', fontSize: 11, fontWeight: '700' },
  checkLabel: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: colors.ink },
  checkLabelDone: { textDecorationLine: 'line-through', color: colors.mist },

  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  movieTile: { width: '47%' },
  movieThumb: { width: '100%', height: 78, borderRadius: radii.sm, marginBottom: 6 },
  movieTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink, fontWeight: '600' },
  subTile: {
    width: '47%', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.6)', padding: 12,
  },
  subTilePlay: { fontSize: 15, color: colors.purpleDark, marginBottom: 4 },
  subTileTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink, fontWeight: '600' },
  subTileMeta: { fontFamily: fonts.body, fontSize: 10, color: colors.mist, marginTop: 2 },

  dailyMsg: { fontFamily: fonts.displayItalic, fontSize: 17, fontStyle: 'italic', color: colors.ink2, lineHeight: 26 },

  auraWrap: { alignItems: 'center', marginTop: 12 },
  auraBtnRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 12 },
  infoText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.purpleDark, textAlign: 'center', marginTop: 8 },

  shortcutRow: { flexDirection: 'row', gap: 10 },
  shortcutTile: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)',
    borderRadius: radii.md, paddingVertical: 20, alignItems: 'center',
  },
  shortcutIcon: { fontSize: 24, marginBottom: 7 },
  shortcutLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink, fontWeight: '600', textAlign: 'center' },
});
