import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlassCard from '../GlassCard';
import { getFunToolData, saveFunToolData } from '../../services/api';

const LOCAL_KEY = 'mv_auction_local';
const BID_AMOUNTS = [50, 100, 200, 500];

const CHECKIN_ITEMS = [
  { id: 'affirmed', label: 'I said my affirmations today', pts: 50 },
  { id: 'gratitude', label: 'I wrote in gratitude today', pts: 40 },
  { id: 'feelt', label: 'I felt my desire for 60+ seconds', pts: 60 },
  { id: 'journal', label: 'I journaled or scripted today', pts: 55 },
  { id: 'meditate', label: 'I meditated or did breathwork', pts: 45 },
  { id: 'moved', label: 'I moved my body / exercised', pts: 35 },
  { id: 'aligned', label: 'I took an inspired action today', pts: 70 },
  { id: 'letgo', label: 'I practised detachment today', pts: 50 },
];

function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }

export default function AuctionTool() {
  const [points, setPoints] = useState(0);
  const [desires, setDesires] = useState([]);
  const [checkinDate, setCheckinDate] = useState('');
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checked, setChecked] = useState({});
  const [newDesire, setNewDesire] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const local = await AsyncStorage.getItem(LOCAL_KEY);
        if (local) {
          const d = JSON.parse(local);
          setPoints(d.points || 0); setDesires(d.desires || []); setCheckinDate(d.checkin || '');
        }
      } catch (e) {}
      try {
        const remote = await getFunToolData('fun_auction');
        if (remote) {
          if (remote.auction) { setPoints(remote.auction.points || 0); setDesires(remote.auction.desires || []); }
          if (remote.checkin !== undefined) setCheckinDate(remote.checkin || '');
        }
      } catch (e) {}
    })();
  }, []);

  const persist = useCallback(async (nextPoints, nextDesires, nextCheckin) => {
    const data = { points: nextPoints, desires: nextDesires, checkin: nextCheckin };
    try { await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch (e) {}
    try { await saveFunToolData('fun_auction', { auction: { points: nextPoints, desires: nextDesires }, checkin: nextCheckin }); } catch (e) {}
  }, []);

  const today = new Date().toDateString();
  const checkinDone = checkinDate === today;

  const handleOpenCheckin = () => {
    if (checkinDone) { Alert.alert('Already checked in today ✨'); return; }
    setChecked({});
    setCheckinOpen(true);
  };

  const handleToggleCheck = (id) => {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  };

  const handleSubmitCheckin = () => {
    const earned = CHECKIN_ITEMS.filter((i) => checked[i.id]).reduce((s, i) => s + i.pts, 0);
    if (!earned) { Alert.alert('Tick at least one practice ✨'); return; }
    const nextPoints = points + earned;
    setPoints(nextPoints);
    setCheckinDate(today);
    setCheckinOpen(false);
    setChecked({});
    persist(nextPoints, desires, today);
    Alert.alert(`+${fmt(earned)} belief points earned! 🎉`);
  };

  const handleAdd = () => {
    if (!newDesire.trim()) { Alert.alert('Name your desire first ✨'); return; }
    if (desires.find((d) => d.name.toLowerCase() === newDesire.trim().toLowerCase())) {
      Alert.alert('That desire is already in the auction ✨'); return;
    }
    const next = [...desires, { name: newDesire.trim(), bid: 0 }];
    setDesires(next);
    persist(points, next, checkinDate);
    setNewDesire('');
  };

  const handleBid = (origIdx, amt) => {
    if (points < amt) { Alert.alert('Not enough belief points — check in daily to earn! ✨'); return; }
    const nextDesires = desires.map((d, i) => (i === origIdx ? { ...d, bid: (d.bid || 0) + amt } : d));
    const nextPoints = points - amt;
    setPoints(nextPoints);
    setDesires(nextDesires);
    persist(nextPoints, nextDesires, checkinDate);
  };

  const handleDelete = (origIdx) => {
    Alert.alert('Remove this desire?', desires[origIdx]?.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const next = desires.filter((_, i) => i !== origIdx);
        setDesires(next);
        persist(points, next, checkinDate);
      } },
    ]);
  };

  const maxBid = desires.length ? Math.max(...desires.map((d) => d.bid || 0), 1) : 1;
  const sorted = desires.map((d, i) => ({ ...d, origIdx: i })).sort((a, b) => (b.bid || 0) - (a.bid || 0));
  const rankMedal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);
  const rankBg = (i) => (i === 0 ? '#d4a030' : i === 1 ? '#a0a0b0' : i === 2 ? '#a87040' : 'rgba(201,168,201,0.2)');

  return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <Text style={styles.title}>Desire <Text style={styles.titleAccent}>Auction</Text></Text>
        <Text style={styles.subtitle}>Bid your belief points on what matters most. Highest bidder rises to the top.</Text>

        <View style={styles.ptsBanner}>
          <View>
            <Text style={styles.ptsNum}>{fmt(points)}</Text>
            <Text style={styles.ptsLbl}>Belief Points</Text>
          </View>
          <TouchableOpacity style={[styles.dailyBtn, checkinDone && styles.dailyBtnDone]} onPress={handleOpenCheckin} disabled={checkinDone}>
            <Text style={[styles.dailyBtnText, checkinDone && styles.dailyBtnTextDone]}>{checkinDone ? '✓ Checked In Today' : '+ Daily Check-In'}</Text>
          </TouchableOpacity>
        </View>

        {checkinOpen && !checkinDone && (
          <GlassCard style={{ marginBottom: 16 }}>
            <Text style={styles.checkinTitle}>What did you do for your desires today?</Text>
            {CHECKIN_ITEMS.map((item) => {
              const isChecked = !!checked[item.id];
              return (
                <TouchableOpacity key={item.id} style={[styles.checkinItem, isChecked && styles.checkinItemOn]} onPress={() => handleToggleCheck(item.id)}>
                  <View style={[styles.checkbox, isChecked && styles.checkboxOn]}>
                    {isChecked && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={styles.checkinName}>{item.label}</Text>
                  <Text style={styles.checkinPts}>+{item.pts}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.checkinSubmit} onPress={handleSubmitCheckin}>
              <Text style={styles.checkinSubmitText}>Collect My Points ✦</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        <Text style={styles.sectionLbl}>Add a desire to the auction</Text>
        <View style={styles.addRow}>
          <View style={[styles.inputBordered, { flex: 1, marginBottom: 0 }]}>
            <TextInput
              style={styles.input}
              placeholder="e.g. My dream apartment in the city"
              placeholderTextColor="rgba(46,37,48,0.4)"
              value={newDesire}
              onChangeText={setNewDesire}
            />
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLbl, { marginTop: 18 }]}>Your desires — ranked by belief invested</Text>
        {desires.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIc}>🎴</Text>
            <Text style={styles.emptyTitle}>Add your first desire above</Text>
            <Text style={styles.emptyDesc}>Then bid your belief points on it. The more you invest, the more you rank ✦</Text>
          </View>
        ) : (
          sorted.map((d, i) => {
            const barPct = maxBid ? Math.round(((d.bid || 0) / maxBid) * 100) : 0;
            return (
              <GlassCard key={d.origIdx} style={{ marginBottom: 10 }} noPadding>
                <View style={styles.itemTop}>
                  <View style={[styles.itemRank, { backgroundColor: rankBg(i) }]}>
                    <Text style={styles.itemRankText}>{rankMedal(i)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{d.name}</Text>
                    <Text style={styles.itemBid}>Total bid: <Text style={styles.itemBidEm}>{fmt(d.bid || 0)} belief pts</Text></Text>
                  </View>
                </View>
                <View style={styles.bidRow}>
                  <View style={styles.bidOpts}>
                    {BID_AMOUNTS.map((amt) => (
                      <TouchableOpacity key={amt} style={styles.bidOpt} onPress={() => handleBid(d.origIdx, amt)}>
                        <Text style={styles.bidOptText}>+{amt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(d.origIdx)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.barWrap}>
                  <View style={[styles.bar, { width: `${barPct}%` }]} />
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500' },

  ptsBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(201,168,201,0.1)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.2)', borderRadius: 16, padding: 16, marginBottom: 16 },
  ptsNum: { fontSize: 30, fontWeight: '300', color: '#9a5fa8', lineHeight: 32 },
  ptsLbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#6b5c66', marginTop: 2 },
  dailyBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 50, borderWidth: 1.5, borderColor: '#c9a8c9', backgroundColor: 'rgba(201,168,201,0.1)' },
  dailyBtnText: { fontSize: 12, fontWeight: '600', color: '#9a5fa8' },
  dailyBtnDone: { borderColor: 'rgba(154,95,168,0.2)', backgroundColor: 'transparent' },
  dailyBtnTextDone: { color: '#6b5c66' },

  checkinTitle: { fontSize: 15, color: '#2e2530', marginBottom: 12, fontWeight: '600' },
  checkinItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.15)', borderRadius: 12, marginBottom: 8 },
  checkinItemOn: { borderColor: 'rgba(90,171,124,0.4)', backgroundColor: 'rgba(90,171,124,0.08)' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', justifyContent: 'center', alignItems: 'center' },
  checkboxOn: { backgroundColor: '#5aab7c', borderColor: '#5aab7c' },
  checkboxTick: { color: '#fff', fontSize: 11, fontWeight: '700' },
  checkinName: { flex: 1, fontSize: 13, color: '#2e2530' },
  checkinPts: { fontSize: 12.5, color: '#5aab7c', fontWeight: '600' },
  checkinSubmit: { marginTop: 6, backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 13, alignItems: 'center' },
  checkinSubmitText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  sectionLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#9a5fa8', marginBottom: 10 },
  addRow: { flexDirection: 'row', gap: 8 },
  inputBordered: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.35)', borderRadius: 16, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontSize: 14, color: '#2e2530', paddingVertical: 12 },
  addBtn: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 20, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', padding: 24, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', borderStyle: 'dashed', borderRadius: 16, backgroundColor: 'rgba(201,168,201,0.05)' },
  emptyIc: { fontSize: 28, marginBottom: 8 },
  emptyTitle: { fontSize: 15, color: '#2e2530', marginBottom: 6, fontWeight: '500' },
  emptyDesc: { fontSize: 12.5, color: '#6b5c66', textAlign: 'center', lineHeight: 18 },

  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 10 },
  itemRank: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  itemRankText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  itemName: { fontSize: 15, color: '#2e2530', fontWeight: '500' },
  itemBid: { fontSize: 11.5, color: '#6b5c66', marginTop: 1 },
  itemBidEm: { color: '#9a5fa8', fontWeight: '600' },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingBottom: 10, flexWrap: 'wrap' },
  bidOpts: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', flex: 1 },
  bidOpt: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', backgroundColor: 'rgba(201,168,201,0.07)' },
  bidOptText: { fontSize: 11.5, fontWeight: '600', color: '#9a5fa8' },
  deleteBtn: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(107,92,102,0.25)' },
  deleteBtnText: { fontSize: 11, color: '#6b5c66' },
  barWrap: { height: 4, backgroundColor: 'rgba(201,168,201,0.12)' },
  bar: { height: '100%', backgroundColor: '#c9a8c9' },
});