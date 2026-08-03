import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Switch, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { getProfile, updateProfile, getSubscriptionStatus, cancelSubscription, reactivateSubscription, openBillingPortal, createCheckout, changePassword, deleteAccount, submitFeedback } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import Chip from '../../components/Chip';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii } from '../../constants/theme';
import * as Linking from 'expo-linking';

const AFF_STYLES = ['i_am', 'you_are', 'mix'];

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { refresh: refreshPlan } = usePlanStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [primaryDesire, setPrimaryDesire] = useState('');
  const [affStyle, setAffStyle] = useState('mix');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  const [fbOpen, setFbOpen] = useState(false);
  const [fbMessage, setFbMessage] = useState('');
  const [fbSaving, setFbSaving] = useState(false);
  const [fbError, setFbError] = useState('');

  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const [profile, sub] = await Promise.all([getProfile(), getSubscriptionStatus()]);
      setFirstName(profile.first_name || '');
      setPrimaryDesire(profile.primary_desire || '');
      setAffStyle(profile.affirmation_style || 'mix');
      setMarketingConsent(!!profile.marketing_consent);
      setSubStatus(sub);
    } catch (e) {
      setError(e.message || 'Could not load profile');
    }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    setError(''); setSaving(true); setSaved(false);
    try {
      await updateProfile({
        first_name: firstName,
        primary_desire: primaryDesire,
        affirmation_style: affStyle,
        marketing_consent: marketingConsent,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message || 'Could not save');
    } finally { setSaving(false); }
  };

  const handleCancelSub = async () => {
    setError('');
    try {
      await cancelSubscription();
      load();
    } catch (e) { setError(e.message || 'Could not cancel'); }
  };

  const handleReactivateSub = async () => {
    setError('');
    try {
      await reactivateSubscription();
      load();
      refreshPlan();
    } catch (e) { setError(e.message || 'Could not reactivate'); }
  };

  const handleSelectPlan = async (priceKey) => {
    try {
      const res = await createCheckout(priceKey);
      if (res?.url) await Linking.openURL(res.url);
      setShowUpgrade(false);
    } catch (e) {
      setError(e.message || 'Could not start checkout');
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true); setError('');
    try {
      const res = await openBillingPortal();
      if (res?.url) await Linking.openURL(res.url);
    } catch (e) {
      setError(e.message || 'Could not open billing portal');
    } finally { setPortalLoading(false); }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { setPwError('Enter both your current and new password.'); return; }
    setPwError(''); setPwSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setPwOpen(false);
      setCurrentPw(''); setNewPw('');
      Alert.alert('Password changed ✨');
    } catch (e) {
      setPwError(e.message || 'Could not change password');
    } finally { setPwSaving(false); }
  };

  const handleSubmitFeedback = async () => {
    if (!fbMessage.trim()) { setFbError('Write your feedback first.'); return; }
    setFbError(''); setFbSaving(true);
    try {
      await submitFeedback(fbMessage.trim());
      setFbOpen(false);
      setFbMessage('');
      Alert.alert('Thank you for your feedback ✨');
    } catch (e) {
      setFbError(e.message || 'Could not submit feedback');
    } finally { setFbSaving(false); }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount();
            await logout();
            router.replace('/(auth)/login');
          } catch (e) {
            setDeleting(false);
            Alert.alert('Could not delete account', e.message || 'Please try again.');
          }
        } },
      ],
    );
  };

  if (loading) {
    return <GradientBackground><View style={styles.center}><ActivityIndicator size="large" color="#c9a8c9" /></View></GradientBackground>;
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <ScreenHeader lead="Pro" accent="file" subtitle="Your account, plan & preferences ✨" />

        <GlassCard style={styles.cardMargin}>
          <Text style={styles.label}>ACCOUNT</Text>
          <Text style={styles.readonlyLabel}>Username</Text>
          <Text style={styles.readonlyValue}>{user?.username}</Text>
          <Text style={styles.readonlyLabel}>Email</Text>
          <Text style={styles.readonlyValue}>{user?.email}</Text>
        </GlassCard>

        <GlassCard style={styles.cardMargin}>
          <Text style={styles.label}>PLAN</Text>
          <Text style={styles.planText}>{subStatus?.plan?.toUpperCase()} · {subStatus?.plan_status}</Text>
          {subStatus?.days_left_trial != null && (
            <Text style={styles.muted}>{subStatus.days_left_trial} days left in trial</Text>
          )}

          {(!subStatus?.plan || subStatus.plan === 'free') && (
            <Button title="Upgrade Plan ✨" onPress={() => setShowUpgrade(true)} fullWidth style={{ marginTop: 10 }} />
          )}

          {subStatus?.plan_status === 'active' && subStatus?.plan !== 'free' && (
            <>
              <Button title="Manage Billing" variant="ghost" fullWidth loading={portalLoading} onPress={handleManageBilling} style={{ marginTop: 10 }} />
              <Button title="Cancel Subscription" variant="danger" fullWidth onPress={handleCancelSub} style={{ marginTop: 8 }} />
            </>
          )}
          {subStatus?.plan_status === 'canceled' && (
            <Button title="Reactivate Subscription" variant="ghost" fullWidth onPress={handleReactivateSub} style={{ marginTop: 10 }} />
          )}
        </GlassCard>

        <GlassCard style={styles.cardMargin}>
          <Text style={styles.label}>PERSONALIZE</Text>
          <View style={styles.inputBox}>
            <TextInput style={styles.input} placeholder="First name" placeholderTextColor="rgba(46,37,48,0.4)" value={firstName} onChangeText={setFirstName} />
          </View>
          <View style={[styles.inputBox, { marginTop: 10 }]}>
            <TextInput style={styles.input} placeholder="Primary desire" placeholderTextColor="rgba(46,37,48,0.4)" value={primaryDesire} onChangeText={setPrimaryDesire} />
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>AFFIRMATION STYLE</Text>
          <View style={styles.chipRow}>
            {AFF_STYLES.map((s) => (
              <Chip key={s} label={s.replace('_', ' ')} active={affStyle === s} onPress={() => setAffStyle(s)} />
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>MARKETING EMAILS</Text>
            <Switch value={marketingConsent} onValueChange={setMarketingConsent} trackColor={{ false: '#e8d5e8', true: '#c9a8c9' }} thumbColor="#fff" />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {saved ? <Text style={styles.savedText}>Saved ✨</Text> : null}

          <Button title="Save Changes" onPress={handleSave} loading={saving} fullWidth style={{ marginTop: 4 }} />
        </GlassCard>

        <GlassCard style={styles.cardMargin}>
          <Text style={styles.label}>ACCOUNT MANAGEMENT</Text>
          <Button title="Change Password" variant="ghost" fullWidth onPress={() => setPwOpen(true)} style={{ marginTop: 4 }} />
          <Button title="Send Feedback" variant="ghost" fullWidth onPress={() => setFbOpen(true)} style={{ marginTop: 8 }} />
          <Button title="Delete Account" variant="danger" fullWidth loading={deleting} onPress={handleDeleteAccount} style={{ marginTop: 8 }} />
        </GlassCard>

        <Button title="Log out" variant="danger" onPress={handleLogout} style={{ alignSelf: 'center', marginTop: 8, marginBottom: 40 }} />
      </ScrollView>

      <UpgradeModal
        visible={showUpgrade}
        message="Choose the plan that fits your practice."
        onClose={() => setShowUpgrade(false)}
        onSelectPlan={handleSelectPlan}
      />

      <Modal visible={pwOpen} animationType="slide" transparent onRequestClose={() => setPwOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <View style={[styles.inputBox, { marginBottom: 10 }]}>
              <TextInput
                style={styles.input}
                placeholder="Current password"
                placeholderTextColor="rgba(46,37,48,0.4)"
                secureTextEntry
                value={currentPw}
                onChangeText={setCurrentPw}
              />
            </View>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor="rgba(46,37,48,0.4)"
                secureTextEntry
                value={newPw}
                onChangeText={setNewPw}
              />
            </View>
            {pwError ? <Text style={styles.errorText}>{pwError}</Text> : null}
            <Button title="Change Password" onPress={handleChangePassword} loading={pwSaving} fullWidth style={{ marginTop: 14 }} />
            <TouchableOpacity onPress={() => { setPwOpen(false); setPwError(''); setCurrentPw(''); setNewPw(''); }} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={fbOpen} animationType="slide" transparent onRequestClose={() => setFbOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Send Feedback</Text>
            <View style={[styles.inputBox, { minHeight: 100 }]}>
              <TextInput
                style={styles.input}
                placeholder="What's on your mind?"
                placeholderTextColor="rgba(46,37,48,0.4)"
                multiline
                value={fbMessage}
                onChangeText={setFbMessage}
              />
            </View>
            {fbError ? <Text style={styles.errorText}>{fbError}</Text> : null}
            <Button title="Send Feedback" onPress={handleSubmitFeedback} loading={fbSaving} fullWidth style={{ marginTop: 14 }} />
            <TouchableOpacity onPress={() => { setFbOpen(false); setFbError(''); setFbMessage(''); }} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardMargin: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  readonlyLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, marginTop: 8 },
  readonlyValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, fontWeight: '500' },
  planText: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.purpleDark, fontWeight: '700', marginBottom: 4 },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 12 },
  inputBox: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 8, flexWrap: 'wrap' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginBottom: 10, textAlign: 'center' },
  savedText: { fontFamily: fonts.bodyMedium, color: colors.success, fontSize: 13, marginBottom: 10, textAlign: 'center', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(46,37,48,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fffaf3', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalTitle: { fontFamily: fonts.displayMedium, fontSize: 19, fontWeight: '400', color: colors.ink, marginBottom: 16 },
  cancelText: { fontFamily: fonts.body, color: colors.mist, fontSize: 13.5, fontWeight: '500' },
});
