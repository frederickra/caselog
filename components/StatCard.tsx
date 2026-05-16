import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string | number;
  accent?: boolean;
}

export function StatCard({ label, value, accent }: Props) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      <Text style={[styles.label, accent && styles.labelAccent]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardAccent: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  valueAccent: { color: '#ffffff' },
  label: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  labelAccent: { color: '#bfdbfe' },
});
