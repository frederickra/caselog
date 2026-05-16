import { useState } from 'react';
import {
  View, Text, TextInput, Switch, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Platform, Modal, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import type { CaseFormValues } from '../lib/types';

const LOCATIONS = ['SF', 'HC', 'FSC', 'Forte'];
const ANESTHETIC_TYPES = ['General', 'MAC', 'Regional', 'Spinal', 'Epidural', 'Sedation', 'Combined'];
const ASA_STATUSES = ['1', '2', '3', '4', '5', '6', '1E', '2E', '3E', '4E', '5E'];

type ActivePicker = 'date' | 'start_time' | 'end_time' | null;

interface Props {
  initialValues: CaseFormValues;
  onSave: (values: CaseFormValues) => Promise<void> | void;
  onDelete?: () => void;
  saveLabel?: string;
}

function minutesBetween(start: Date, end: Date): number {
  const s = start.getHours() * 60 + start.getMinutes();
  const e = end.getHours() * 60 + end.getMinutes();
  return e > s ? e - s : 0;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

function num(s: string): number { return parseFloat(s) || 0; }

export function CaseForm({ initialValues, onSave, onDelete, saveLabel = 'Save Case' }: Props) {
  const [form, setForm] = useState<CaseFormValues>(initialValues);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof CaseFormValues>(key: K, value: CaseFormValues[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const totalMinutes = minutesBetween(form.start_time, form.end_time);
  const suggestedUnits = totalMinutes > 0 ? (totalMinutes / 15).toFixed(1) : '';

  // Auto-computed billing totals
  const computedTotalUnits = num(form.base_value) + num(form.time_units) + num(form.modifiers) + num(form.procedure_units);
  const computedWorkUnits = num(form.base_value) + num(form.time_units) + num(form.adjusted_units);
  const computedNetWorkUnits = form.is_split ? computedWorkUnits - num(form.split_units) : computedWorkUnits;

  const pickerValue = activePicker === 'date'
    ? form.date
    : activePicker === 'start_time'
    ? form.start_time
    : form.end_time;

  const handlePickerChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setActivePicker(null);
    if (!date) return;
    if (activePicker === 'date') {
      update('date', date);
    } else if (activePicker === 'start_time') {
      update('start_time', date);
      const mins = minutesBetween(date, form.end_time);
      if (mins > 0) update('time_units', (mins / 15).toFixed(1));
    } else if (activePicker === 'end_time') {
      update('end_time', date);
      const mins = minutesBetween(form.start_time, date);
      if (mins > 0) update('time_units', (mins / 15).toFixed(1));
    }
  };

  const handleSave = async () => {
    if (!form.surgeon.trim()) {
      Alert.alert('Required', 'Surgeon name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Case', 'Are you sure you want to delete this case?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Case Information */}
        <SectionHeader title="Case Information" />

        <Field label="Date" required>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setActivePicker('date')}>
            <Text style={styles.pickerButtonText}>{format(form.date, 'MMMM d, yyyy')}</Text>
          </TouchableOpacity>
        </Field>

        <Field label="Ticket Number">
          <StyledInput value={form.ticket_number} onChangeText={v => update('ticket_number', v)} placeholder="e.g. 12345" />
        </Field>

        <Field label="Surgeon" required>
          <StyledInput value={form.surgeon} onChangeText={v => update('surgeon', v)} placeholder="Surgeon name" />
        </Field>

        {/* Location — tap-to-select chips */}
        <Field label="Location">
          <View style={styles.chipRow}>
            {LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[styles.chip, form.location === loc && styles.chipActive]}
                onPress={() => update('location', form.location === loc ? '' : loc)}
              >
                <Text style={[styles.chipText, form.location === loc && styles.chipTextActive]}>{loc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Add-on Case">
          <View style={styles.switchRow}>
            <Switch
              value={form.is_add_on}
              onValueChange={v => update('is_add_on', v)}
              trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }}
              thumbColor={form.is_add_on ? '#1d4ed8' : '#94a3b8'}
            />
            <Text style={styles.switchLabel}>{form.is_add_on ? 'Yes' : 'No'}</Text>
          </View>
        </Field>

        {/* Clinical Details */}
        <SectionHeader title="Clinical Details" />

        <Field label="Diagnosis">
          <StyledInput value={form.diagnosis} onChangeText={v => update('diagnosis', v)} placeholder="Diagnosis / ICD code" />
        </Field>

        <Field label="Procedure">
          <StyledInput value={form.procedure_name} onChangeText={v => update('procedure_name', v)} placeholder="Procedure name / CPT" />
        </Field>

        <Field label="Anesthetic Type">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {ANESTHETIC_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, form.anesthetic_type === type && styles.chipActive]}
                  onPress={() => update('anesthetic_type', form.anesthetic_type === type ? '' : type)}
                >
                  <Text style={[styles.chipText, form.anesthetic_type === type && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Field>

        {/* #2 — renamed ASA Code → ASA Status */}
        <Field label="ASA Status">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {ASA_STATUSES.map(code => (
                <TouchableOpacity
                  key={code}
                  style={[styles.chip, form.asa_code === code && styles.chipActive]}
                  onPress={() => update('asa_code', form.asa_code === code ? '' : code)}
                >
                  <Text style={[styles.chipText, form.asa_code === code && styles.chipTextActive]}>{code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Field>

        {/* Timing */}
        <SectionHeader title="Timing" />

        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Field label="Start Time">
              <TouchableOpacity style={styles.pickerButton} onPress={() => setActivePicker('start_time')}>
                <Text style={styles.pickerButtonText}>{format(form.start_time, 'h:mm aa')}</Text>
              </TouchableOpacity>
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="End Time">
              <TouchableOpacity style={styles.pickerButton} onPress={() => setActivePicker('end_time')}>
                <Text style={styles.pickerButtonText}>{format(form.end_time, 'h:mm aa')}</Text>
              </TouchableOpacity>
            </Field>
          </View>
        </View>

        <InfoBox label="Total Time" value={formatDuration(totalMinutes)} />

        {/* Billing */}
        <SectionHeader title="Billing" />

        {/* #3 — 5-digit ASA billing code before Base Value */}
        <Field label="ASA Code (5-digit)">
          <StyledInput
            value={form.asa_billing_code}
            onChangeText={v => update('asa_billing_code', v)}
            placeholder="e.g. 00100"
            keyboardType="numeric"
          />
        </Field>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Field label="Base Value">
              <StyledInput value={form.base_value} onChangeText={v => update('base_value', v)} placeholder="0" keyboardType="decimal-pad" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label={`Time Units${suggestedUnits ? ` (est. ${suggestedUnits})` : ''}`}>
              <StyledInput value={form.time_units} onChangeText={v => update('time_units', v)} placeholder={suggestedUnits || '0'} keyboardType="decimal-pad" />
            </Field>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            {/* Modifiers now numeric for auto-sum */}
            <Field label="Modifiers">
              <StyledInput value={form.modifiers} onChangeText={v => update('modifiers', v)} placeholder="0" keyboardType="decimal-pad" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Procedure Units">
              <StyledInput value={form.procedure_units} onChangeText={v => update('procedure_units', v)} placeholder="0" keyboardType="decimal-pad" />
            </Field>
          </View>
        </View>

        {/* #4 — Total Units auto-computed */}
        <InfoBox label="Total Units" value={computedTotalUnits.toFixed(1)} />

        {/* Reimbursed Modifiers */}
        <Field label="Reimbursed Modifiers">
          <StyledInput value={form.adjusted_units} onChangeText={v => update('adjusted_units', v)} placeholder="0" keyboardType="decimal-pad" />
        </Field>

        {/* Total Work Units (gross) */}
        <InfoBox label="Total Work Units" value={computedWorkUnits.toFixed(1)} accent />

        {/* Split Case toggle */}
        <View style={styles.splitRow}>
          <Switch
            value={form.is_split}
            onValueChange={v => update('is_split', v)}
            trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }}
            thumbColor={form.is_split ? '#1d4ed8' : '#94a3b8'}
          />
          <Text style={styles.splitLabel}>Split Case</Text>
          {form.is_split && (
            <View style={styles.splitBadge}>
              <Text style={styles.splitBadgeText}>Active</Text>
            </View>
          )}
        </View>

        {/* Split details — only visible when toggled on */}
        {form.is_split && (
          <>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Field label="Split Provider">
                  <StyledInput
                    value={form.split_provider}
                    onChangeText={v => update('split_provider', v)}
                    placeholder="Other anesthesiologist"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Their Units">
                  <StyledInput
                    value={form.split_units}
                    onChangeText={v => update('split_units', v)}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </Field>
              </View>
            </View>
            <InfoBox
              label="Split Case Total Work Units"
              value={computedNetWorkUnits.toFixed(1)}
              color="green"
            />
          </>
        )}

        {/* Insurance & Notes */}
        <SectionHeader title="Insurance & Notes" />

        <Field label="Insurance Company">
          <StyledInput value={form.insurance_company} onChangeText={v => update('insurance_company', v)} placeholder="Insurance carrier" />
        </Field>

        <Field label="Notes">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.notes}
            onChangeText={v => update('notes', v)}
            placeholder="Additional notes…"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>

        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{saveLabel}</Text>}
        </TouchableOpacity>

        {onDelete && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Case</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {activePicker !== null && Platform.OS === 'android' && (
        <DateTimePicker value={pickerValue} mode={activePicker === 'date' ? 'date' : 'time'} onChange={handlePickerChange} />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={activePicker !== null} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActivePicker(null)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {activePicker === 'date' ? 'Select Date' : activePicker === 'start_time' ? 'Start Time' : 'End Time'}
              </Text>
              <TouchableOpacity onPress={() => setActivePicker(null)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            {activePicker !== null && (
              <DateTimePicker value={pickerValue} mode={activePicker === 'date' ? 'date' : 'time'} display="spinner" onChange={handlePickerChange} style={styles.picker} />
            )}
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionDivider} />
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required && <Text style={styles.required}> *</Text>}</Text>
      {children}
    </View>
  );
}

function InfoBox({ label, value, accent, color }: { label: string; value: string; accent?: boolean; color?: 'green' }) {
  const isGreen = color === 'green';
  return (
    <View style={[styles.infoBox, accent && styles.infoBoxAccent, isGreen && styles.infoBoxGreen]}>
      <Text style={[styles.infoLabel, accent && styles.infoLabelAccent, isGreen && styles.infoLabelGreen]}>{label}</Text>
      <Text style={[styles.infoValue, accent && styles.infoValueAccent, isGreen && styles.infoValueGreen]}>{value}</Text>
    </View>
  );
}

function StyledInput({ value, onChangeText, placeholder, keyboardType }: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      keyboardType={keyboardType ?? 'default'}
      autoCorrect={false}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.6, marginRight: 10 },
  sectionDivider: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#dc2626' },

  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: { height: 100, paddingTop: 12 },

  pickerButton: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerButtonText: { fontSize: 16, color: '#0f172a' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  switchLabel: { fontSize: 15, color: '#374151' },

  chipScroll: { marginHorizontal: -2 },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2, flexWrap: 'nowrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  chipText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '600' },

  timeRow: { flexDirection: 'row', gap: 12 },
  twoCol: { flexDirection: 'row', gap: 12 },

  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBoxAccent: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  infoBoxGreen: { backgroundColor: '#065f46', borderColor: '#065f46' },
  infoLabel: { fontSize: 13, fontWeight: '600', color: '#1d4ed8' },
  infoLabelAccent: { color: '#bfdbfe' },
  infoLabelGreen: { color: '#6ee7b7' },
  infoValue: { fontSize: 16, fontWeight: '700', color: '#1e40af' },
  infoValueAccent: { color: '#ffffff', fontSize: 18 },
  infoValueGreen: { color: '#ffffff', fontSize: 18 },

  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  splitLabel: { fontSize: 15, fontWeight: '600', color: '#374151', flex: 1 },
  splitBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  splitBadgeText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },

  saveButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },

  deleteButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  deleteButtonText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  pickerDone: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },
  picker: { backgroundColor: '#ffffff' },
});
