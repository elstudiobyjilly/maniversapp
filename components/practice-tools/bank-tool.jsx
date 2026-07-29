import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlassCard from '../GlassCard';
import { getFunToolData, saveFunToolData } from '../../services/api';

const VIS_KEY = 'mv_bank_vis_local';
const EARN_KEY = 'mv_bank_earn_local';

const EARN_ACTIONS = [
  { id: 'affirm', ic: '✨', name: 'Affirm', desc: 'Complete an affirmation session', pts: 500 },
  { id: 'gratitude', ic: '🙏', name: 'Gratitude', desc: "Log 3 things you're grateful for", pts: 300 },
  { id: 'scripting', ic: '✍️', name: 'Scripting', desc: 'Write your desire in present tense', pts: 400 },
  { id: 'feelin', ic: '💫', name: 'Feel It', desc: 'Do a 60-second feeling session', pts: 350 },
  { id: 'meditate', ic: '🧘', name: 'Meditate', desc: 'Complete a meditation', pts: 600 },
  { id: 'vision', ic: '🖼️', name: 'Vision Board', desc: 'Spend time with your vision board', pts: 250 },
];

const EARN_LABELS = {
  affirm: 'Affirmation Session', gratitude: 'Gratitude Practice', scripting: 'Scripting Practice',
  feelin: 'Feel It Session', meditate: 'Meditation', vision: 'Vision Board Session',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}
function dateStr() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BankTool() {
  const [mode, setMode] = useState('vis');
  const [visTxs, setVisTxs] = useState([]);
  const [earnData, setEarnData] = useState({ balance: 0, transactions: [], lastEarnDates: {} });
  const [depositLabel, setDepositLabel] = useState('');
  const [depositAmt, setDepositAmt] = useState('');
  const [spendLabel, setSpendLabel] = useState('');
  const [spendAmt, setSpendAmt] = useState('');
  const [earnSpendLabel, setEarnSpendLabel] = useState('');
  const [earnSpendAmt, setEarnSpendAmt] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [localVis, localEarn] = await Promise.all([
          AsyncStorage.getItem(VIS_KEY),
          AsyncStorage.getItem(EARN_KEY),
        ]);
        if (localVis) setVisTxs(JSON.parse(localVis));
        if (localEarn) setEarnData(JSON.parse(localEarn));
      } catch (e) {}
      try {
        const remote = await getFunToolData('fun_bank');
        if (remote) {
          if (remote.vis !== undefined) setVisTxs(remote.vis);
          if (remote.earn !== undefined) setEarnData(remote.earn);
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (vis, earn) => {
    try {
      await AsyncStorage.setItem(VIS_KEY, JSON.stringify(vis));
      await AsyncStorage.setItem(EARN_KEY, JSON.stringify(earn));
    } catch (e) {}
    try { await saveFunToolData('fun_bank', { vis, earn }); } catch (e) {}
  }, []);

  const balance = visTxs.reduce((s, t) => s + (t.type === 'dep' ? t.amount : -t.amount), 0);
  const deps = visTxs.filter((t) => t.type === 'dep').length;
  const spends = visTxs.filter((t) => t.type === 'spend').length;

  const handleVisDeposit = () => {
    const amt = parseInt(depositAmt, 10);
    if (!depositLabel.trim()) { Alert.alert('Write your desire first ✨'); return; }
    if (!amt || amt < 1) { Alert.alert('Enter an amount'); return; }
    const next = [...visTxs, { type: 'dep', label: depositLabel.trim(), amount: amt, date: dateStr() }];
    setVisTxs(next);
    persist(next, earnData);
    setDepositLabel(''); setDepositAmt('');
  };

  const handleVisSpend = () => {
    const amt = parseInt(spendAmt, 10);
    if (!spendLabel.trim()) { Alert.alert('Write what you manifested ✨'); return; }
    if (!amt || amt < 1) { Alert.alert('Enter an amount'); return; }
    const next = [...visTxs, { type: 'spend', label: spendLabel.trim(), amount: amt, date: dateStr() }];
    setVisTxs(next);
    persist(next, earnData);
    setSpendLabel(''); setSpendAmt('');
  };

  const handleClearVis = () => {
    Alert.alert('Clear all transactions?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setVisTxs([]); persist([], earnData); } },
    ]);
  };

  const today = new Date().toDateString();
  const todayEarned = Object.keys(earnData.lastEarnDates || {}).filter((k) => earnData.lastEarnDates[k] === today);

  const handleEarn = (actionId, pts) => {
    if (earnData.lastEarnDates?.[actionId] === today) { Alert.alert('Already earned today for this ✨'); return; }
    const next = {
      ...earnData,
      balance: (earnData.balance || 0) + pts,
      lastEarnDates: { ...earnData.lastEarnDates, [actionId]: today },
      transactions: [...(earnData.transactions || []), { type: 'dep', label: EARN_LABELS[actionId] || actionId, amount: pts, date: dateStr() }],
    };
    setEarnData(next);
    persist(visTxs, next);
  };

  const handleEarnSpend = () => {
    const amt = parseInt(earnSpendAmt, 10);
    if (!earnSpendLabel.trim()) { Alert.alert('Name your desire ✨'); return; }
    if (!amt || amt < 1) { Alert.alert('Enter a cost'); return; }
    if ((earnData.balance || 0) < amt) { Alert.alert('Not enough coins yet — keep practicing! ✨'); return; }
    const next = {
      ...earnData,
      balance: earnData.balance - amt,
      transactions: [...(earnData.transactions || []), { type: 'spend', label: earnSpendLabel.trim(), amount: amt, date: dateStr() }],
    };
    setEarnData(next);
    persist(visTxs, next);
    setEarnSpendLabel(''); setEarnSpendAmt('');
  };

  const TxRowInner = ({ t }) => (
    <>
      <View style={[styles.txIcWrap, { backgroundColor: t.type === 'dep' ? 'rgba(110,207,160,0.15)' : 'rgba(240,144,184,0.15)' }]}>
        <Text style={styles.txIcText}>{t.type === 'dep' ? '↑' : '↓'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txLabel} numberOfLines={1}>{t.label}</Text>
        <Text style={styles.txDate}>{t.date}</Text>
      </View>
      <Text style={[styles.txAmount, { color: t.type === 'dep' ? '#5aab7c' : '#d46888' }]}>
        {t.type === 'dep' ? '+' : '-'}${fmt(t.amount)}
      </Text>
    </>
  );

  return (
    <View style={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.title}>Manifestation <Text style={styles.titleAccent}>Bank</Text></Text>
        <Text style={styles.subtitle}>Visualise your wealth — earn coins from every practice you complete.</Text>

        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modeBtn, mode === 'vis' && styles.modeBtnOn]} onPress={() => setMode('vis')}>
            <Text style={[styles.modeBtnText, mode === 'vis' && styles.modeBtnTextOn]}>🏦 Visualization</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, mode === 'earn' && styles.modeBtnOn]} onPress={() => setMode('earn')}>
            <Text style={[styles.modeBtnText, mode === 'earn' && styles.modeBtnTextOn]}>✨ Earn & Spend</Text>
          </TouchableOpacity>
        </View>

        {mode === 'vis' ? (
          <>
            <View style={[styles.bankCard, { backgroundColor: '#1a0a2e' }]}>
              <View style={styles.cardTop}>
                <Text style={styles.cardLogo}>Manivers</Text>
                <Text style={styles.cardType}>ABUNDANCE ACCOUNT</Text>
              </View>
              <Text style={styles.cardNum}>•••• •••• •••• 2024</Text>
              <View>
                <Text style={styles.cardBalanceLbl}>AVAILABLE BALANCE</Text>
                <Text style={styles.cardBalance}><Text style={styles.cardCurrency}>$</Text>{fmt(Math.max(0, balance))}</Text>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.cardName}>YOUR NAME</Text>
                <View style={styles.cardChip} />
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statNum}>{deps}</Text><Text style={styles.statLbl}>Deposits</Text></View>
              <View style={styles.statBox}><Text style={styles.statNum}>${fmt(Math.max(0, balance))}</Text><Text style={styles.statLbl}>Balance</Text></View>
              <View style={styles.statBox}><Text style={styles.statNum}>{spends}</Text><Text style={styles.statLbl}>Spent</Text></View>
            </View>

            <GlassCard style={{ marginBottom: 14 }}>
              <Text style={styles.formTitle}>➕ Make a Deposit — write a desire you already have</Text>
              <View style={styles.inputBordered}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. My dream car is paid in full"
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={depositLabel}
                  onChangeText={setDepositLabel}
                />
              </View>
              <View style={styles.formRow}>
                <View style={[styles.inputBordered, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Amount"
                    placeholderTextColor="rgba(46,37,48,0.4)"
                    keyboardType="numeric"
                    value={depositAmt}
                    onChangeText={setDepositAmt}
                  />
                </View>
                <TouchableOpacity style={styles.primaryBtnSm} onPress={handleVisDeposit}>
                  <Text style={styles.primaryBtnSmText}>Deposit</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            <GlassCard style={{ marginBottom: 14 }}>
              <Text style={styles.formTitle}>💸 Make a Purchase — what did you manifest today?</Text>
              <View style={styles.inputBordered}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Booked my dream holiday"
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={spendLabel}
                  onChangeText={setSpendLabel}
                />
              </View>
              <View style={styles.formRow}>
                <View style={[styles.inputBordered, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Amount"
                    placeholderTextColor="rgba(46,37,48,0.4)"
                    keyboardType="numeric"
                    value={spendAmt}
                    onChangeText={setSpendAmt}
                  />
                </View>
                <TouchableOpacity style={styles.outlineBtnSm} onPress={handleVisSpend}>
                  <Text style={styles.outlineBtnSmText}>Spend</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            <View style={styles.txHeaderRow}>
              <Text style={styles.txHeader}>Transaction History</Text>
              <TouchableOpacity onPress={handleClearVis}><Text style={styles.txClear}>Clear all</Text></TouchableOpacity>
            </View>
            <GlassCard noPadding>
              {visTxs.length === 0 ? (
                <Text style={styles.emptyText}>Your abundance account is ready.{'\n'}Make your first deposit ✨</Text>
              ) : (
                visTxs.slice().reverse().map((t, i) => (
                  <View key={i} style={[styles.txRow, i < visTxs.length - 1 && styles.txDivider]}>
                    <TxRowInner t={t} />
                  </View>
                ))
              )}
            </GlassCard>
          </>
        ) : (
          <>
            <View style={[styles.bankCard, { backgroundColor: '#0d1f12' }]}>
              <View style={styles.cardTop}>
                <Text style={styles.cardLogo}>Manivers</Text>
                <Text style={styles.cardType}>ABUNDANCE COINS</Text>
              </View>
              <Text style={styles.cardNum}>•••• •••• •••• 2024</Text>
              <View>
                <Text style={styles.cardBalanceLbl}>COIN BALANCE</Text>
                <Text style={styles.cardBalance}><Text style={styles.cardCurrency}>$</Text>{fmt(earnData.balance)}</Text>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.cardName}>{todayEarned.length}/{EARN_ACTIONS.length} TODAY</Text>
                <View style={styles.cardChip} />
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statNum}>{todayEarned.length}</Text><Text style={styles.statLbl}>Today</Text></View>
              <View style={styles.statBox}><Text style={styles.statNum}>${fmt(earnData.balance)}</Text><Text style={styles.statLbl}>Balance</Text></View>
              <View style={styles.statBox}><Text style={styles.statNum}>{(earnData.transactions || []).length}</Text><Text style={styles.statLbl}>Earned</Text></View>
            </View>

            <Text style={styles.sectionLbl}>Earn Today</Text>
            <View style={{ marginBottom: 14 }}>
              {EARN_ACTIONS.map((a) => {
                const done = earnData.lastEarnDates?.[a.id] === today;
                return (
                  <GlassCard key={a.id} style={{ marginBottom: 8 }}>
                    <View style={styles.earnRow}>
                      <View style={styles.earnIcWrap}><Text style={{ fontSize: 16 }}>{a.ic}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.earnName}>{a.name}</Text>
                        <Text style={styles.earnDesc}>{a.desc}</Text>
                      </View>
                      <Text style={styles.earnPts}>+${fmt(a.pts)}</Text>
                      <TouchableOpacity
                        style={[styles.earnBtn, done && styles.earnBtnDone]}
                        disabled={done}
                        onPress={() => handleEarn(a.id, a.pts)}
                      >
                        <Text style={[styles.earnBtnText, done && styles.earnBtnTextDone]}>{done ? '✓ Done' : 'Earn'}</Text>
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                );
              })}
            </View>

            <GlassCard style={{ marginBottom: 14 }}>
              <Text style={styles.formTitle}>💸 Spend on a Desire — invest your coins in what you want</Text>
              <View style={styles.inputBordered}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. My dream apartment"
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={earnSpendLabel}
                  onChangeText={setEarnSpendLabel}
                />
              </View>
              <View style={styles.formRow}>
                <View style={[styles.inputBordered, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Cost"
                    placeholderTextColor="rgba(46,37,48,0.4)"
                    keyboardType="numeric"
                    value={earnSpendAmt}
                    onChangeText={setEarnSpendAmt}
                  />
                </View>
                <TouchableOpacity style={styles.outlineBtnSm} onPress={handleEarnSpend}>
                  <Text style={styles.outlineBtnSmText}>Spend</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            <Text style={styles.sectionLbl}>Recent Activity</Text>
            <GlassCard noPadding>
              {(earnData.transactions || []).length === 0 ? (
                <Text style={styles.emptyText}>Complete practices to earn abundance coins ✨</Text>
              ) : (
                earnData.transactions.slice().reverse().slice(0, 12).map((t, i, arr) => (
                  <View key={i} style={[styles.txRow, i < arr.length - 1 && styles.txDivider]}>
                    <TxRowInner t={t} />
                  </View>
                ))
              )}
            </GlassCard>
          </>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500' },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', alignItems: 'center' },
  modeBtnOn: { backgroundColor: '#c9a8c9', borderColor: 'transparent' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6b5c66' },
  modeBtnTextOn: { color: '#fff' },

  bankCard: { borderRadius: 22, padding: 22, paddingBottom: 18, marginBottom: 14, minHeight: 160, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLogo: { fontStyle: 'italic', fontSize: 17, color: '#fff', opacity: 0.85 },
  cardType: { fontSize: 10, letterSpacing: 1.2, color: '#fff', opacity: 0.55, fontWeight: '600' },
  cardNum: { fontSize: 13, letterSpacing: 3, color: '#fff', opacity: 0.4, marginTop: 10, marginBottom: 2 },
  cardBalanceLbl: { fontSize: 10, letterSpacing: 1, color: '#fff', opacity: 0.5 },
  cardBalance: { fontSize: 34, fontWeight: '300', color: '#fff', lineHeight: 38 },
  cardCurrency: { fontSize: 18, opacity: 0.7 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardName: { fontSize: 11, letterSpacing: 1, color: '#fff', opacity: 0.6 },
  cardChip: { width: 32, height: 24, borderRadius: 5, backgroundColor: '#d4af70', opacity: 0.7 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.2)', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  statNum: { fontSize: 19, fontWeight: '300', color: '#9a5fa8' },
  statLbl: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#6b5c66', marginTop: 2 },

  formTitle: { fontSize: 14, color: '#2e2530', marginBottom: 10, fontWeight: '600' },
  inputBordered: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.35)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  input: { fontSize: 14, color: '#2e2530', paddingVertical: 8 },
  formRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  primaryBtnSm: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 18 },
  primaryBtnSmText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  outlineBtnSm: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#c9a8c9', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 18 },
  outlineBtnSmText: { color: '#9a5fa8', fontSize: 13, fontWeight: '600' },

  txHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  txHeader: { fontSize: 15, color: '#2e2530', fontWeight: '600' },
  txClear: { fontSize: 12, color: '#6b5c66' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  txDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.12)' },
  txIcWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  txIcText: { fontSize: 14, color: '#2e2530' },
  txLabel: { fontSize: 13, color: '#2e2530', fontWeight: '500' },
  txDate: { fontSize: 11, color: '#6b5c66', marginTop: 1 },
  txAmount: { fontSize: 16, fontWeight: '500' },
  emptyText: { textAlign: 'center', padding: 28, fontStyle: 'italic', color: '#6b5c66', fontSize: 13 },

  sectionLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#9a5fa8', marginBottom: 10, marginLeft: 4 },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  earnIcWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(201,168,201,0.15)', justifyContent: 'center', alignItems: 'center' },
  earnName: { fontSize: 13, color: '#2e2530', fontWeight: '500' },
  earnDesc: { fontSize: 11, color: '#6b5c66', marginTop: 1 },
  earnPts: { fontSize: 14, color: '#5aab7c', fontWeight: '500' },
  earnBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(90,171,124,0.4)', backgroundColor: 'rgba(90,171,124,0.1)' },
  earnBtnDone: { borderColor: 'rgba(154,95,168,0.2)', backgroundColor: 'transparent' },
  earnBtnText: { fontSize: 11, fontWeight: '600', color: '#3d8a5c' },
  earnBtnTextDone: { color: '#6b5c66' },
});