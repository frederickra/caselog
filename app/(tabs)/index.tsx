import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getDashboardStats } from '../../lib/database';
import { StatCard } from '../../components/StatCard';
import type { Period, DashboardStats } from '../../lib/types';
import { format } from 'date-fns';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function DashboardScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(() => {
    setStats(getDashboardStats(period));
  }, [period]);

  useFocusEffect(loadStats);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
    setRefreshing(false);
  };

  const fmt = (n: number, decimals = 1) => n.toFixed(decimals);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.heading}>Case Log Summary</Text>
      <Text style={styles.subheading}>{format(new Date(), 'MMMM yyyy')}</Text>

      <View style={styles.periodSelector}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodButton, period === p.key && styles.periodButtonActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {stats && (
        <>
          <GroupLabel label="Volume" />
          <View style={styles.row}>
            <StatCard label="Cases" value={stats.cases} />
            <StatCard label="Days Worked" value={stats.daysWorked} />
          </View>

          <GroupLabel label="Units" />
          <View style={styles.row}>
            <StatCard label="Total Units" value={fmt(stats.totalUnits)} />
            <StatCard label="Total Work Units" value={fmt(stats.workUnits)} accent />
          </View>
          <View style={styles.row}>
            <StatCard label="Units / Day" value={fmt(stats.unitsPerDay)} />
            <StatCard label="Units / Case" value={fmt(stats.unitsPerCase)} />
          </View>

          <GroupLabel label="Time" />
          <View style={styles.row}>
            <StatCard label="Total Hours" value={fmt(stats.totalHours)} />
            <StatCard label="Units / Hour" value={fmt(stats.unitsPerHour)} />
          </View>
        </>
      )}

      {stats?.cases === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No cases recorded for this period.</Text>
          <Text style={styles.emptyHint}>Tap "New Case" to log your first case.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function GroupLabel({ label }: { label: string }) {
  return (
    <View style={styles.groupLabel}>
      <Text style={styles.groupLabelText}>{label}</Text>
      <View style={styles.groupDivider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },

  heading: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  subheading: { fontSize: 14, color: '#64748b', marginBottom: 20 },

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  periodText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  periodTextActive: { color: '#1d4ed8', fontWeight: '700' },

  groupLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  groupLabelText: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginRight: 8 },
  groupDivider: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },

  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },

  empty: { alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 16, color: '#94a3b8', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#cbd5e1' },
});
