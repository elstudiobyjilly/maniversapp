import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { updateProfile, addProfilePerson, deleteProfilePerson } from '../../services/api';
import Button from '../../components/Button';
import Chip from '../../components/Chip';
import { colors, fonts, radii, shadows } from '../../constants/theme';

const TOTAL_STEPS = 5;

const GENDERS = ['female', 'male', 'nonbinary', 'prefer not to say'];
const DESIRE_AREAS = ['Money', 'Love', 'Career', 'Health', 'Confidence', 'Home', 'Spirituality'];
const RELATIONSHIP_STATUSES = ['single', 'dating', 'relationship', 'married', "it's complicated"];
const PERSON_TYPES = ['partner', 'ex', 'crush', 'someone new'];
const RELATIONSHIPS = ['partner', 'best_friend', 'family', 'mentor', 'friend', 'other'];
const HOME_TYPES = ['apartment', 'house', 'condo', 'other'];
const INCOME_PERIODS = ['weekly', 'monthly', 'yearly'];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 0
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  // Step 1
  const [primaryDesire, setPrimaryDesire] = useState('');
  const [otherDesires, setOtherDesires] = useState([]);

  // Step 2
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [manifestingPerson, setManifestingPerson] = useState(null); // true | false | 'unknown'
  const [personName, setPersonName] = useState('');
  const [personType, setPersonType] = useState('');
  const [partnerFeeling, setPartnerFeeling] = useState('');
  const [unknownType, setUnknownType] = useState('');
  const [unknownQualities, setUnknownQualities] = useState('');

  // Step 3 — people list
  const [people, setPeople] = useState([]);
  const [pName, setPName] = useState('');
  const [pRelationship, setPRelationship] = useState('partner');
  const [pDescriptor, setPDescriptor] = useState('');
  const [addingPerson, setAddingPerson] = useState(false);

  // Step 4
  const [dreamLifeText, setDreamLifeText] = useState('');
  const [homeType, setHomeType] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomePeriod, setIncomePeriod] = useState('monthly');

  const toggleOtherDesire = (d) => {
    setOtherDesires((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleAddPerson = async () => {
    if (!pName.trim()) { Alert.alert('Enter a name ✨'); return; }
    setAddingPerson(true);
    try {
      const person = await addProfilePerson({ name: pName.trim(), relationship: pRelationship, descriptor: pDescriptor.trim() });
      setPeople((prev) => [...prev, person]);
      setPName(''); setPDescriptor('');
    } catch (e) {
      Alert.alert('Could not add person', e.message || 'Please try again.');
    } finally { setAddingPerson(false); }
  };

  const handleRemovePerson = (person, index) => {
    setPeople((prev) => prev.filter((_, i) => i !== index));
    if (person.id != null) { deleteProfilePerson(person.id).catch(() => {}); }
  };

  const buildSaveData = (done) => ({
    first_name: firstName.trim(),
    age: age ? parseInt(age, 10) : null,
    gender: gender || null,
    primary_desire: primaryDesire.trim(),
    other_desires: otherDesires,
    relationship_status: relationshipStatus || null,
    manifesting_person: manifestingPerson,
    manifesting_person_name: personName.trim() || null,
    manifesting_person_type: personType || null,
    partner_feeling: partnerFeeling.trim() || null,
    manifesting_unknown_type: unknownType.trim() || null,
    manifesting_unknown_qualities: unknownQualities.trim() || null,
    dream_life_text: dreamLifeText.trim() || null,
    home_type: homeType || null,
    home_location: homeLocation.trim() || null,
    income_amount: incomeAmount ? parseFloat(incomeAmount) : null,
    income_period: incomePeriod || null,
    onboarding_done: done,
  });

  const handleNext = async () => {
    if (step === 0 && !firstName.trim()) { setError('Tell us your name ✨'); return; }
    if (step === 1 && !primaryDesire.trim()) { setError('Describe your main desire ✨'); return; }
    setError('');
    // Autosave progress at every step so nothing is lost if the user leaves.
    try { await updateProfile(buildSaveData(false)); } catch (_) {}
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleFinish();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleFinish();
  };

  const handleFinish = async () => {
    setSaving(true); setError('');
    try {
      await updateProfile(buildSaveData(true));
      router.replace('/(tabs)/dashboard');
    } catch (e) {
      setError(e.message || 'Could not save your profile');
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotDone]} />
          ))}
        </View>

        <View style={styles.card}>
          {step === 0 && (
            <>
              <Text style={styles.heading}>Let's get to know you 🌸</Text>
              <TextInput style={styles.input} placeholder="First name" placeholderTextColor="rgba(46,37,48,0.4)" value={firstName} onChangeText={setFirstName} />
              <TextInput style={styles.input} placeholder="Age (optional)" placeholderTextColor="rgba(46,37,48,0.4)" keyboardType="number-pad" value={age} onChangeText={setAge} />
              <Text style={styles.label}>GENDER (OPTIONAL)</Text>
              <View style={styles.chipRow}>
                {GENDERS.map((g) => (
                  <Chip key={g} label={g} active={gender === g} onPress={() => setGender(gender === g ? '' : g)} />
                ))}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.heading}>What do you want to manifest? ✨</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Describe your main desire right now..."
                placeholderTextColor="rgba(46,37,48,0.4)"
                value={primaryDesire}
                onChangeText={setPrimaryDesire}
                multiline
              />
              <Text style={styles.label}>OTHER AREAS YOU CARE ABOUT (OPTIONAL)</Text>
              <View style={styles.chipRow}>
                {DESIRE_AREAS.map((d) => (
                  <Chip key={d} label={d} active={otherDesires.includes(d)} onPress={() => toggleOtherDesire(d)} />
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.heading}>Anyone specific? 💗</Text>
              <Text style={styles.label}>RELATIONSHIP STATUS</Text>
              <View style={styles.chipRow}>
                {RELATIONSHIP_STATUSES.map((r) => (
                  <Chip key={r} label={r} active={relationshipStatus === r} onPress={() => setRelationshipStatus(relationshipStatus === r ? '' : r)} />
                ))}
              </View>
              <Text style={[styles.label, { marginTop: 14 }]}>ARE YOU MANIFESTING A SPECIFIC PERSON?</Text>
              <View style={styles.chipRow}>
                <Chip label="Yes" active={manifestingPerson === true} onPress={() => setManifestingPerson(true)} />
                <Chip label="Not sure who yet" active={manifestingPerson === 'unknown'} onPress={() => setManifestingPerson('unknown')} />
                <Chip label="No" active={manifestingPerson === false} onPress={() => setManifestingPerson(false)} />
              </View>

              {manifestingPerson === true && (
                <>
                  <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="Their name" placeholderTextColor="rgba(46,37,48,0.4)" value={personName} onChangeText={setPersonName} />
                  <View style={styles.chipRow}>
                    {PERSON_TYPES.map((t) => (
                      <Chip key={t} label={t} active={personType === t} onPress={() => setPersonType(personType === t ? '' : t)} />
                    ))}
                  </View>
                  <TextInput
                    style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                    placeholder="How do you want to feel with them?"
                    placeholderTextColor="rgba(46,37,48,0.4)"
                    value={partnerFeeling}
                    onChangeText={setPartnerFeeling}
                    multiline
                  />
                </>
              )}

              {manifestingPerson === 'unknown' && (
                <>
                  <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="What type of person? (e.g. a soulmate)" placeholderTextColor="rgba(46,37,48,0.4)" value={unknownType} onChangeText={setUnknownType} />
                  <TextInput
                    style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                    placeholder="Qualities you want them to have..."
                    placeholderTextColor="rgba(46,37,48,0.4)"
                    value={unknownQualities}
                    onChangeText={setUnknownQualities}
                    multiline
                  />
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.heading}>Your Inner Circle 👥</Text>
              <Text style={styles.helperText}>Add people you're manifesting around — your AI-generated stories and affirmations will use their real names.</Text>

              {people.map((p, i) => (
                <View key={p.id ?? i} style={styles.personRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{p.name}</Text>
                    <Text style={styles.personMeta}>{(p.relationship || '').replace('_', ' ')}{p.descriptor ? ` · ${p.descriptor}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemovePerson(p, i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.personRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TextInput style={[styles.input, { marginTop: people.length ? 10 : 0 }]} placeholder="Name" placeholderTextColor="rgba(46,37,48,0.4)" value={pName} onChangeText={setPName} />
              <View style={styles.chipRow}>
                {RELATIONSHIPS.map((r) => (
                  <Chip key={r} label={r.replace('_', ' ')} active={pRelationship === r} onPress={() => setPRelationship(r)} />
                ))}
              </View>
              <TextInput style={styles.input} placeholder="Descriptor (optional)" placeholderTextColor="rgba(46,37,48,0.4)" value={pDescriptor} onChangeText={setPDescriptor} />
              <Button title="+ Add Person" variant="ghost" onPress={handleAddPerson} loading={addingPerson} fullWidth style={{ marginTop: 4 }} />
            </>
          )}

          {step === 4 && (
            <>
              <Text style={styles.heading}>Your Dream Life ✨</Text>
              <TextInput
                style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                placeholder="Describe your dream life in a few sentences..."
                placeholderTextColor="rgba(46,37,48,0.4)"
                value={dreamLifeText}
                onChangeText={setDreamLifeText}
                multiline
              />
              <Text style={styles.label}>HOME</Text>
              <View style={styles.chipRow}>
                {HOME_TYPES.map((h) => (
                  <Chip key={h} label={h} active={homeType === h} onPress={() => setHomeType(homeType === h ? '' : h)} />
                ))}
              </View>
              <TextInput style={styles.input} placeholder="Location (city, country)" placeholderTextColor="rgba(46,37,48,0.4)" value={homeLocation} onChangeText={setHomeLocation} />
              <Text style={[styles.label, { marginTop: 4 }]}>INCOME GOAL (OPTIONAL)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Amount" placeholderTextColor="rgba(46,37,48,0.4)" keyboardType="numeric" value={incomeAmount} onChangeText={setIncomeAmount} />
              </View>
              <View style={styles.chipRow}>
                {INCOME_PERIODS.map((p) => (
                  <Chip key={p} label={`/${p}`} active={incomePeriod === p} onPress={() => setIncomePeriod(p)} />
                ))}
              </View>
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.navRow}>
            {step > 0 && (
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            {step >= 2 && (
              <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>

          <Button
            title={step === TOTAL_STEPS - 1 ? "Start Manifesting 🌸" : 'Next →'}
            onPress={handleNext}
            loading={saving}
            fullWidth
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(154,95,168,0.2)' },
  progressDotDone: { backgroundColor: colors.purpleDark },
  card: { backgroundColor: '#fff', borderRadius: radii.lg, padding: 24, ...shadows.card },
  heading: { fontFamily: fonts.displayMedium, fontSize: 20, color: colors.ink, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  helperText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, marginBottom: 14, lineHeight: 18, textAlign: 'center' },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, marginTop: 12, textTransform: 'uppercase' },
  input: { backgroundColor: colors.rose, borderRadius: radii.sm, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.body, fontSize: 15, color: colors.ink, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: 8, textAlign: 'center' },

  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.12)' },
  personName: { fontFamily: fonts.bodyMedium, fontSize: 14, fontWeight: '500', color: colors.ink },
  personMeta: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist, marginTop: 2, textTransform: 'capitalize' },
  personRemove: { color: colors.danger, fontSize: 15, paddingHorizontal: 6 },

  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  backBtnText: { fontFamily: fonts.body, color: colors.mist, fontSize: 13.5 },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  skipBtnText: { fontFamily: fonts.body, color: colors.mist, fontSize: 13.5, textDecorationLine: 'underline' },
});
