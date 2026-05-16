import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCaseById, updateCase, deleteCase, recordToFormValues } from '../../lib/database';
import { CaseForm } from '../../components/CaseForm';
import type { CaseFormValues } from '../../lib/types';

export default function EditCaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [initialValues, setInitialValues] = useState<CaseFormValues | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const record = getCaseById(Number(id));
    if (!record) {
      setNotFound(true);
      return;
    }
    setInitialValues(recordToFormValues(record));
  }, [id]);

  const handleSave = (values: CaseFormValues) => {
    updateCase(Number(id), values);
    router.back();
  };

  const handleDelete = () => {
    deleteCase(Number(id));
    router.back();
  };

  if (notFound) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Case not found.</Text>
      </View>
    );
  }

  if (!initialValues) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1d4ed8" />
      </View>
    );
  }

  return (
    <CaseForm
      initialValues={initialValues}
      onSave={handleSave}
      onDelete={handleDelete}
      saveLabel="Update Case"
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  errorText: { fontSize: 16, color: '#94a3b8' },
});
