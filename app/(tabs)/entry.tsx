import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CaseForm } from '../../components/CaseForm';
import { insertCase } from '../../lib/database';
import type { CaseFormValues } from '../../lib/types';

function defaultValues(): CaseFormValues {
  const now = new Date();
  return {
    date: now,
    ticket_number: '',
    surgeon: '',
    is_add_on: false,
    location: '',
    anesthetic_type: '',
    start_time: now,
    end_time: now,
    asa_code: '',
    asa_billing_code: '',
    base_value: '',
    time_units: '',
    modifiers: '',
    procedure_units: '',
    adjusted_units: '',
    is_split: false,
    split_provider: '',
    split_units: '',
    notes: '',
  };
}

export default function EntryScreen() {
  const router = useRouter();
  // Incrementing this key forces CaseForm to remount with fresh state after each save
  const [formKey, setFormKey] = useState(0);

  const handleSave = (values: CaseFormValues) => {
    insertCase(values);
    setFormKey(k => k + 1);
    Alert.alert('Case Saved', 'The case has been added to your log.', [
      { text: 'OK', onPress: () => router.replace('/(tabs)/log') },
    ]);
  };

  return (
    <CaseForm
      key={formKey}
      initialValues={defaultValues()}
      onSave={handleSave}
      saveLabel="Save Case"
    />
  );
}
