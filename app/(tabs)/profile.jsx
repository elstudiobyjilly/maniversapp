import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { useAuthStore } from '../../store/authStore';
import {
  getProfile, updateProfile, getSubscriptionStatus, cancelSubscription, reactivateSubscription,
  openBillingPortal, createCheckout, changePassword, deleteAccount, submitFeedback,
} from '../../services/api';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import Chip from '../../components/Chip';
import Button from '../../components/Button';
import TabPill from '../../components/TabPill';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, gradients, radii } from '../../constants/theme';
import * as Linking from 'expo-linking';

const AFF_STYLES = ['i_am', 'you_are', 'mix'];
const VOICES = [
  { id: 'luna', label: '🌸 Luna' },
  { id: 'orion', label: '🌙 Orion' },
  { id: 'sage', label: '✨ Sage' },
  { id: 'system', label: '🤖 System' },
];
const TEXT_SIZES = [
  { pct: 85, label: 'A' }, { pct: 92, label: 'A' }, { pct: 100, label: 'A' },
  { pct: 110, label: 'A' }, { pct: 120, label: 'A' }, { pct: 130, label: 'A' },
];
const THEMES = [
  { key: 'blush', label: 'Blush Reverie', desc: 'Pink · Lavender · White', swatches: ['#f8b8c8', '#c9a8c9', '#fdf5e0'], available: true },
  { key: 'soleil', label: 'Soleil Dream', desc: 'Blue · Pink · Yellow', swatches: ['#a8c8f0', '#f8b8c8', '#f5e090'], available: false },
];

const PREFS_KEY = 'mv_settings_prefs';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { refresh: refreshPlan } = usePlanStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [tab, setTab] = useState('profile');

  // Profile
  const [firstName, setFirstName] = useState('');
  const [primaryDesire, setPrimaryDesire] = useState('');
  const [affStyle, setAffStyle] = useState('mix');
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Voice
  const [voiceId, setVoiceId] = useState('luna');
  const [lockVoice, setLockVoice] = useState(true);
  const [secondaryVoiceId, setSecondaryVoiceId] = useState('system');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);

  // Appearance
  const [textSizePct, setTextSizePct] = useState(100);
  const [colorTheme, setColorTheme] = useState('blush');

  // Security
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const load = async () => {
    try {
      const [profile, sub] = await Promise.all([getProfile(), getSubscriptionStatus()]);
      setFirstName(profile.first_name || '');
      setPrimaryDesire(profile.primary_desire || '');
      setAffStyle(profile.affirmation_style || 'mix');
      setSubStatus(sub);
    } catch (e) {
      setError(e.message || 'Could not load profile');
    }
    try {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.voiceId) setVoiceId(p.voiceId);
        if (typeof p.lockVoice === 'boolean') setLockVoice(p.lockVoice);
        if (p.secondaryVoiceId) setSecondaryVoiceId(p.secondaryVoiceId);
        if (p.voiceSpeed) setVoiceSpeed(p.voiceSpeed);
        if (p.textSizePct) setTextSizePct(p.textSizePct);
        if (p.colorTheme) setColorTheme(p.colorTheme);
      }
    } catch (_) {}
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const persistPrefs = async (patch) => {
    const next = { voiceId, lockVoice, secondaryVoiceId, voiceSpeed, textSizePct, colorTheme, ...patch };
    try { await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch (_) {}
    // Best-effort: also try to sync to the backend profile in case it
    // accepts these fields -- harmless no-op if it doesn't recognize them.
    try { await updateProfile(next); } catch (_) {}
  };

  const handleSave = async () => {
    setError(''); setSaving(true); setSaved(false);
    try {
      await updateProfile({
        first_name: firstName,
        primary_desire: primaryDesire,
        affirmation_style: affStyle,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message || 'Could not save');
    } finally { setSaving(false); }
  };

  const handleCancelSub = async () => {
    setError('');
    try { await cancelSubscription(); load(); } catch (e) { setError(e.message || 'Could not cancel'); }
  };
  const handleReactivateSub = async () => {
    setError('');
    try { await reactivateSubscription(); load(); refreshPlan(); } catch (e) { setError(e.message || 'Could not reactivate'); }
  };
  const handleSelectPlan = async (priceKey) => {
    try {
      const res = await createCheckout(priceKey);
      if (res?.url) await Linking.openURL(res.url);
      setShowUpgrade(false);
    } catch (e) { setError(e.message || 'Could not start checkout'); }
  };
  const handleManageBilling = async () => {
    setPortalLoading(true); setError('');
    try {
      const res = await openBillingPortal();
      if (res?.url) await Linking.openURL(res.url);
    } catch (e) { setError(e.message || 'Could not open billing portal'); } finally { setPortalLoading(false); }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete your account?', 'This permanently deletes your account and all your data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteAccount(); await logout(); router.replace('/(auth)/login'); }
        catch (e) { setError(e.message || 'Could not delete account'); }
      } },
    ]);
  };

  const handleUpdatePassword = async () => {
    setPwMsg('');
    if (!currentPw || !newPw) { setPwMsg('Fill in both fields.'); return; }
    if (newPw.length < 8) { setPwMsg('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match.'); return; }
    setPwSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setPwMsg('Password updated ✨');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e) { setPwMsg(e.message || 'Could not update password'); } finally { setPwSaving(false); }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) { setFeedbackMsg('Write something first.'); return; }
    setSendingFeedback(true); setFeedbackMsg('');
    try {
      await submitFeedback(feedbackText.trim(), rating ? `rating_${rating}` : 'general');
      setFeedbackMsg('Thank you for your feedback 🌸');
      setFeedbackText(''); setRating(0);
    } catch (e) { setFeedbackMsg(e.message || 'Could not send feedback'); } finally { setSendingFeedback(false); }
  };

  const handlePreviewVoice = () => {
    Speech.stop();
    Speech.speak('This is how your secondary voice sounds.', { rate: voiceSpeed });
  };

  if (loading) {
    return <GradientBackground><View style={styles.center}><ActivityIndicator size="large" color="#c9a8c9" /></View></GradientBackground>;
  }

  const planLabel = subStatus?.plan && subStatus.plan !== 'free' ? `${subStatus.plan.charAt(0).toUpperCase()}${subStatus.plan.slice(1)} Manifestor` : 'Free Plan';

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>⚙ ACCOUNT</Text>
        <ScreenHeader lead="Your" accent="Settings" subtitle="Everything about your account, in one place ✨" />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'profile', label: '🌸 Profile' },
            { value: 'voice', label: '🎙️ Voice' },
            { value: 'appearance', label: '🔤 Appearance' },
            { value: 'plan', label: '⭐ Plan' },
            { value: 'security', label: '🔒 Security' },
          ]}
        />

        {tab === 'profile' && (
          <>
            <GlassCard style={styles.cardMargin}>
              <LinearGradient colors={gradients.avatar} style={styles.avatar}>
                <Text style={styles.avatarText}>{(firstName || user?.username || '?').charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <Text style={styles.nameText}>{firstName || user?.username}</Text>
              <Text style={styles.usernameText}>@{user?.username}</Text>
              <Text style={styles.emailText}>{user?.email}</Text>
              <View style={styles.planBadge}><Text style={styles.planBadgeText}>{planLabel}</Text></View>
            </GlassCard>

            <Text style={styles.sectionLabel}>EDIT PROFILE</Text>
            <GlassCard style={styles.cardMargin}>
              <View style={styles.inputBox}>
                <TextInput style={styles.input} placeholder="Name" placeholderTextColor="rgba(46,37,48,0.4)" value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={[styles.inputBox, { marginTop: 10 }]}>
                <TextInput style={styles.input} placeholder="Primary desire" placeholderTextColor="rgba(46,37,48,0.4)" value={primaryDesire} onChangeText={setPrimaryDesire} />
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {saved ? <Text style={styles.savedText}>Saved ✨</Text> : null}
              <Button title="💾 Save Profile" onPress={handleSave} loading={saving} size="sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} />

              <View style={styles.divider} />
              <Text style={styles.label}>MY PREFERENCES</Text>
              <View style={styles.prefRow}>
                <Text style={styles.prefLabel}>Story / Affirmation Style</Text>
                <Text style={styles.prefValue}>{affStyle.replace('_', ' ')}</Text>
              </View>
              {editingPrefs ? (
                <View style={styles.chipRow}>
                  {AFF_STYLES.map((s) => (
                    <Chip key={s} label={s.replace('_', ' ')} active={affStyle === s} onPress={() => { setAffStyle(s); setEditingPrefs(false); handleSave(); }} />
                  ))}
                </View>
              ) : (
                <TouchableOpacity style={styles.editPrefsBtn} onPress={() => setEditingPrefs(true)}>
                  <Text style={styles.editPrefsBtnText}>✨ Edit Preferences</Text>
                </TouchableOpacity>
              )}
            </GlassCard>
          </>
        )}

        {tab === 'voice' && (
          <>
            <Text style={styles.sectionLabel}>🌸 NARRATION VOICE</Text>
            <GlassCard style={styles.cardMargin}>
              <Text style={styles.helperText}>One voice for all narration — Affirmations, Stories & Mind Movies — so you never have to pick each time.</Text>
              <View style={styles.chipRow}>
                {VOICES.map((v) => (
                  <Chip key={v.id} label={v.label} active={voiceId === v.id} onPress={() => { setVoiceId(v.id); persistPrefs({ voiceId: v.id }); }} />
                ))}
              </View>
              <TouchableOpacity style={styles.checkRow} onPress={() => { const next = !lockVoice; setLockVoice(next); persistPrefs({ lockVoice: next }); }}>
                <View style={[styles.checkbox, lockVoice && styles.checkboxOn]}>{lockVoice && <Text style={styles.checkmark}>✓</Text>}</View>
                <Text style={styles.checkLabel}>Lock a voice for all narration</Text>
              </TouchableOpacity>
            </GlassCard>

            <Text style={styles.sectionLabel}>🎭 SECONDARY VOICE</Text>
            <GlassCard style={styles.cardMargin}>
              <Text style={styles.helperText}>Used for Portrait, Letters, Scripts, Oracle, Horoscope & Feel It. Your main voice handles affirmations, subliminals & stories.</Text>
              <Text style={styles.label}>VOICE</Text>
              <View style={styles.chipRow}>
                {VOICES.map((v) => (
                  <Chip key={v.id} label={v.label} active={secondaryVoiceId === v.id} onPress={() => { setSecondaryVoiceId(v.id); persistPrefs({ secondaryVoiceId: v.id }); }} />
                ))}
              </View>
              <View style={styles.speedRow}>
                <Text style={styles.label}>SPEED</Text>
                <Text style={styles.speedValue}>{voiceSpeed.toFixed(2)}</Text>
              </View>
              <View style={styles.pillRow}>
                {[0.75, 0.85, 0.92, 1.0, 1.15, 1.3].map((s) => (
                  <TouchableOpacity key={s} style={[styles.speedPill, voiceSpeed === s && styles.speedPillActive]} onPress={() => { setVoiceSpeed(s); persistPrefs({ voiceSpeed: s }); }}>
                    <Text style={[styles.speedPillText, voiceSpeed === s && styles.speedPillTextActive]}>{s}×</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.editPrefsBtn} onPress={handlePreviewVoice}>
                <Text style={styles.editPrefsBtnText}>🎭 Preview Voice</Text>
              </TouchableOpacity>
            </GlassCard>
          </>
        )}

        {tab === 'appearance' && (
          <>
            <Text style={styles.sectionLabel}>TEXT SIZE</Text>
            <GlassCard style={styles.cardMargin}>
              <Text style={styles.helperText}>Adjust text across all of Manivers — scripts, affirmations, journal, and every screen.</Text>
              <View style={styles.textSizeRow}>
                {TEXT_SIZES.map((t) => (
                  <TouchableOpacity key={t.pct} style={[styles.textSizeBtn, textSizePct === t.pct && styles.textSizeBtnActive]} onPress={() => { setTextSizePct(t.pct); persistPrefs({ textSizePct: t.pct }); }}>
                    <Text style={[styles.textSizeLetter, { fontSize: 12 + (t.pct - 85) / 10 }, textSizePct === t.pct && styles.textSizeLetterActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.textSizeCaption}>{textSizePct === 100 ? 'Default' : textSizePct < 100 ? 'Smaller' : 'Larger'} · {textSizePct}%</Text>
            </GlassCard>

            <Text style={styles.sectionLabel}>COLOUR THEME ✨</Text>
            <GlassCard style={styles.cardMargin}>
              <Text style={styles.helperText}>Choose the look and feel of Manivers.</Text>
              <View style={styles.themeRow}>
                {THEMES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.themeCard, colorTheme === t.key && styles.themeCardActive]}
                    onPress={() => {
                      if (!t.available) { Alert.alert('Coming soon ✨', `${t.label} is on its way — for now Blush Reverie is the only active theme.`); return; }
                      setColorTheme(t.key); persistPrefs({ colorTheme: t.key });
                    }}
                  >
                    <View style={styles.swatchRow}>
                      {t.swatches.map((c, i) => <View key={i} style={[styles.swatch, { backgroundColor: c }]} />)}
                    </View>
                    <Text style={styles.themeLabel}>{t.label}</Text>
                    <Text style={styles.themeDesc}>{t.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.themeActiveText}>{THEMES.find((t) => t.key === colorTheme)?.label} active 🌸</Text>
            </GlassCard>
          </>
        )}

        {tab === 'plan' && (
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.label}>CURRENT PLAN</Text>
            <Text style={styles.planText}>{subStatus?.plan?.toUpperCase()}</Text>
            <Text style={styles.muted}>Status: {subStatus?.plan_status}</Text>
            {subStatus?.renews_at && <Text style={styles.muted}>Renews {new Date(subStatus.renews_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>}
            {subStatus?.days_left_trial != null && <Text style={styles.muted}>{subStatus.days_left_trial} days left in trial</Text>}

            {(!subStatus?.plan || subStatus.plan === 'free') && (
              <Button title="Upgrade Plan ✨" onPress={() => setShowUpgrade(true)} fullWidth style={{ marginTop: 12 }} />
            )}
            {subStatus?.plan_status === 'active' && subStatus?.plan !== 'free' && (
              <View style={styles.planBtnRow}>
                <Button title="💳 Manage Billing" variant="ghost" size="sm" loading={portalLoading} onPress={handleManageBilling} />
                <Button title="Cancel Plan" variant="danger" size="sm" onPress={handleCancelSub} />
              </View>
            )}
            {subStatus?.plan_status === 'canceled' && (
              <Button title="Reactivate Subscription" variant="ghost" fullWidth onPress={handleReactivateSub} style={{ marginTop: 10 }} />
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </GlassCard>
        )}

        {tab === 'security' && (
          <>
            <Text style={styles.sectionLabel}>CHANGE PASSWORD</Text>
            <GlassCard style={styles.cardMargin}>
              <View style={styles.inputBox}>
                <TextInput style={styles.input} placeholder="Current password" placeholderTextColor="rgba(46,37,48,0.4)" secureTextEntry value={currentPw} onChangeText={setCurrentPw} />
              </View>
              <View style={[styles.inputBox, { marginTop: 10 }]}>
                <TextInput style={styles.input} placeholder="New password (min 8 chars)" placeholderTextColor="rgba(46,37,48,0.4)" secureTextEntry value={newPw} onChangeText={setNewPw} />
              </View>
              <View style={[styles.inputBox, { marginTop: 10 }]}>
                <TextInput style={styles.input} placeholder="Confirm new password" placeholderTextColor="rgba(46,37,48,0.4)" secureTextEntry value={confirmPw} onChangeText={setConfirmPw} />
              </View>
              {pwMsg ? <Text style={styles.errorText}>{pwMsg}</Text> : null}
              <Button title="🔑 Update Password" size="sm" onPress={handleUpdatePassword} loading={pwSaving} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            </GlassCard>

            <Text style={styles.sectionLabel}>FEEDBACK 🌸</Text>
            <GlassCard style={styles.cardMargin}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setRating(n)}>
                    <Text style={styles.star}>{n <= rating ? '⭐' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.inputBox, { minHeight: 90 }]}>
                <TextInput
                  style={[styles.input, { textAlignVertical: 'top' }]}
                  placeholder="What do you love? What could be better? ✨"
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                />
              </View>
              {feedbackMsg ? <Text style={styles.savedText}>{feedbackMsg}</Text> : null}
              <Button title="Send Feedback 🌸" onPress={handleSendFeedback} loading={sendingFeedback} fullWidth style={{ marginTop: 10 }} />
            </GlassCard>

            <Text style={[styles.sectionLabel, { color: colors.danger }]}>ACCOUNT ACTIONS</Text>
            <GlassCard style={styles.cardMargin}>
              <View style={styles.planBtnRow}>
                <Button title="↩ Sign Out" variant="ghost" size="sm" onPress={handleLogout} />
                <Button title="🗑️ Delete Account" variant="danger" size="sm" onPress={handleDeleteAccount} />
              </View>
            </GlassCard>
          </>
        )}
      </ScrollView>

      <UpgradeModal
        visible={showUpgrade}
        message="Choose the plan that fits your practice."
        onClose={() => setShowUpgrade(false)}
        onSelectPlan={handleSelectPlan}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  eyebrow: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.mist, letterSpacing: 1.5, textAlign: 'center', marginBottom: 2, textTransform: 'uppercase' },
  cardMargin: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  sectionLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  helperText: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, lineHeight: 17, marginBottom: 12 },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 12 },

  avatar: { width: 72, height: 72, borderRadius: 36, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { fontFamily: fonts.display, fontSize: 30, color: '#fff' },
  nameText: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, textAlign: 'center' },
  usernameText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, textAlign: 'center', marginTop: 2 },
  emailText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist, textAlign: 'center', marginTop: 1 },
  planBadge: { alignSelf: 'center', backgroundColor: 'rgba(201,168,201,0.2)', borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 12, marginTop: 10 },
  planBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.purpleDark, fontWeight: '700' },

  inputBox: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4, marginTop: 4, flexWrap: 'wrap' },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 12.5, marginTop: 8, textAlign: 'center' },
  savedText: { fontFamily: fonts.bodyMedium, color: colors.success, fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '600' },

  divider: { height: 1, backgroundColor: 'rgba(154,95,168,0.12)', marginVertical: 16 },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  prefLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  prefValue: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, fontStyle: 'italic' },
  editPrefsBtn: { borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderRadius: radii.pill, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)' },
  editPrefsBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, fontWeight: '600' },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.4)', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  checkLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },

  speedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  speedValue: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  speedPill: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  speedPillActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  speedPillText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.ink2 },
  speedPillTextActive: { color: '#fff', fontWeight: '700' },

  textSizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  textSizeBtn: { flex: 1, minWidth: 44, paddingVertical: 12, borderRadius: radii.sm, borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center' },
  textSizeBtnActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  textSizeLetter: { fontFamily: fonts.bodyMedium, color: colors.ink },
  textSizeLetterActive: { color: '#fff' },
  textSizeCaption: { fontFamily: fonts.body, fontSize: 12, color: colors.purpleDark, textAlign: 'center' },

  themeRow: { flexDirection: 'row', gap: 10 },
  themeCard: { flex: 1, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.md, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  themeCardActive: { borderColor: colors.purpleDark, backgroundColor: 'rgba(201,168,201,0.12)' },
  swatchRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  themeLabel: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink, fontWeight: '700' },
  themeDesc: { fontFamily: fonts.body, fontSize: 10.5, color: colors.mist, marginTop: 2 },
  themeActiveText: { fontFamily: fonts.displayItalic, fontSize: 12, color: colors.mist, fontStyle: 'italic', marginTop: 10 },

  planText: { fontFamily: fonts.displayMedium, fontSize: 20, color: colors.purpleDark, fontWeight: '700', marginBottom: 4 },
  planBtnRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  star: { fontSize: 26 },
});
