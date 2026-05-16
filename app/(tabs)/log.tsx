import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Platform, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { getCases } from '../../lib/database';
import { exportCasesToExcel } from '../../lib/export';
import { CaseListItem } from '../../components/CaseListItem';
import type { CaseRecord, SortOption } from '../../lib/types';

const LOCATIONS = ['SF', 'HC', 'FSC', 'Forte'];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'date_desc', label: 'Newest' },
  { key: 'date_asc', label: 'Oldest' },
  { key: 'units_desc', label: 'Most Units' },
];

type DateTarget = 'from' | 'to' | null;

export default function LogScreen() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [locationFilter, setLocationFilter] = useState('');
  const [activeDatePicker, setActiveDatePicker] = useState<DateTarget>(null);
  const [exporting, setExporting] = useState(false);

  const hasActiveFilters = !!(dateFrom || dateTo || locationFilter);

  const loadCases = useCallback(() => {
    setCases(getCases({
      search: search.trim() || undefined,
      sortBy,
      dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
      dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
      location: locationFilter || undefined,
    }));
  }, [search, sortBy, dateFrom, dateTo, locationFilter]);

  useFocusEffect(loadCases);

  const handleExport = async () => {
    if (cases.length === 0) {
      Alert.alert('Nothing to Export', 'No cases match the current search and filters.');
      return;
    }
    setExporting(true);
    try {
      await exportCasesToExcel(cases);
    } catch (e) {
      Alert.alert('Export Failed', 'Could not generate the Excel file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setLocationFilter('');
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setActiveDatePicker(null);
    if (!date) return;
    if (activeDatePicker === 'from') setDateFrom(date);
    else if (activeDatePicker === 'to') setDateTo(date);
  };

  const pickerDate = activeDatePicker === 'from'
    ? (dateFrom ?? new Date())
    : (dateTo ?? new Date());

  return (
    <View style={styles.container}>

      {/* Search bar + filter toggle */}
      <View style={styles.topRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Surgeon, ticket, ASA code, procedure…"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadCases}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters(v => !v)}
        >
          <Ionicons name="options-outline" size={19} color={hasActiveFilters ? '#ffffff' : '#475569'} />
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, exporting && styles.filterBtnDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator size="small" color="#475569" />
            : <Ionicons name="share-outline" size={19} color="#475569" />
          }
        </TouchableOpacity>
      </View>

      {/* Expandable filter panel */}
      {showFilters && (
        <View style={styles.filterPanel}>

          {/* Date range */}
          <Text style={styles.filterGroupLabel}>Date Range</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setActiveDatePicker('from')}>
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text style={styles.dateBtnText}>{dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From date'}</Text>
              {dateFrom && (
                <TouchableOpacity onPress={() => setDateFrom(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={15} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            <Text style={styles.dateSep}>–</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setActiveDatePicker('to')}>
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text style={styles.dateBtnText}>{dateTo ? format(dateTo, 'MMM d, yyyy') : 'To date'}</Text>
              {dateTo && (
                <TouchableOpacity onPress={() => setDateTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={15} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Location chips */}
          <Text style={styles.filterGroupLabel}>Location</Text>
          <View style={styles.locationRow}>
            {LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[styles.locChip, locationFilter === loc && styles.locChipActive]}
                onPress={() => setLocationFilter(locationFilter === loc ? '' : loc)}
              >
                <Text style={[styles.locChipText, locationFilter === loc && styles.locChipTextActive]}>{loc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sort + count */}
      <View style={styles.controls}>
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortChip, sortBy === s.key && styles.sortChipActive]}
              onPress={() => setSortBy(s.key)}
            >
              <Text style={[styles.sortChipText, sortBy === s.key && styles.sortChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.count}>{cases.length} {cases.length === 1 ? 'case' : 'cases'}</Text>
      </View>

      {/* Case list */}
      <FlatList
        data={cases}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <CaseListItem item={item} onPress={() => router.push(`/edit/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={52} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>
              {search || hasActiveFilters ? 'No matching cases' : 'No cases yet'}
            </Text>
            <Text style={styles.emptyHint}>
              {search || hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'Tap "New Case" to log your first case'}
            </Text>
          </View>
        }
      />

      {/* Android date picker */}
      {activeDatePicker !== null && Platform.OS === 'android' && (
        <DateTimePicker value={pickerDate} mode="date" onChange={handleDateChange} />
      )}

      {/* iOS date picker bottom sheet */}
      {Platform.OS === 'ios' && (
        <Modal visible={activeDatePicker !== null} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveDatePicker(null)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {activeDatePicker === 'from' ? 'From Date' : 'To Date'}
              </Text>
              <TouchableOpacity onPress={() => setActiveDatePicker(null)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            {activeDatePicker !== null && (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.picker}
              />
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },

  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  filterBtnDisabled: { opacity: 0.5 },
  filterDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },

  filterPanel: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  dateBtnText: { flex: 1, fontSize: 13, color: '#374151' },
  dateSep: { fontSize: 16, color: '#94a3b8', fontWeight: '300' },

  locationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  locChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  locChipText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  locChipTextActive: { color: '#ffffff', fontWeight: '600' },

  clearBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 4,
  },
  clearBtnText: { fontSize: 13, color: '#dc2626', fontWeight: '600' },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  sortChipActive: { backgroundColor: '#1d4ed8' },
  sortChipText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  sortChipTextActive: { color: '#ffffff', fontWeight: '600' },
  count: { marginLeft: 'auto', fontSize: 13, color: '#94a3b8' },

  list: { paddingHorizontal: 16, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 17, color: '#64748b', fontWeight: '600' },
  emptyHint: { fontSize: 14, color: '#94a3b8' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
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
