import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string;
  green?: boolean;
  bold?: boolean;
}

export default function SummaryRow({ label, value, green, bold }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.value, green && { color: 'green' }, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#555' },
  value: { color: '#000' },
  bold: { fontWeight: '700' },
});
