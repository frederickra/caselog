import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import type { CaseRecord } from '../lib/types';

interface Props {
  item: CaseRecord;
  onPress: () => void;
}

export function CaseListItem({ item, onPress }: Props) {
  const dateStr = item.date ? format(parseISO(item.date), 'MMM d, yyyy') : '—';
  const timeRange = item.start_time && item.end_time
    ? `${item.start_time} – ${item.end_time}`
    : item.start_time || '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.date}>{dateStr}</Text>
        <View style={styles.badges}>
          {item.is_add_on === 1 && (
            <View style={styles.addOnBadge}>
              <Text style={styles.addOnText}>Add-on</Text>
            </View>
          )}
          {item.is_split === 1 && (
            <View style={styles.splitBadge}>
              <Text style={styles.splitText}>Split</Text>
            </View>
          )}
          <View style={styles.unitsBadge}>
            <Text style={styles.unitsText}>{(item.work_units ?? 0).toFixed(1)} units</Text>
          </View>
        </View>
      </View>

      <Text style={styles.surgeon}>{item.surgeon || '—'}</Text>

      <View style={styles.footer}>
        <Text style={styles.meta}>#{item.ticket_number || '—'}</Text>
        {!!timeRange && <Text style={styles.meta}>{timeRange}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  date: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addOnBadge: {
    backgroundColor: '#ede9fe',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  addOnText: { fontSize: 11, color: '#7c3aed', fontWeight: '600' },
  splitBadge: {
    backgroundColor: '#ecfdf5',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  splitText: { fontSize: 11, color: '#065f46', fontWeight: '600' },
  unitsBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unitsText: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  surgeon: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  procedure: { fontSize: 14, color: '#475569', marginBottom: 8 },
  footer: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 4 },
  meta: { fontSize: 12, color: '#94a3b8' },
});
