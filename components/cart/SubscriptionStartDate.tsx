import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import COLORS from '@/constants/colors';

const PRIMARY = COLORS.primary;

interface Props {
  selectedDaysExist: boolean;
  selectedStartDate: Date | null;
  setSelectedStartDate: (date: Date) => void;
  clearError: () => void;
  getAvailableDates: () => Date[];
  formatDate: (date: Date) => string;
  formatSelectedDate: (date: Date) => string;
}

export default function SubscriptionStartDate({ selectedDaysExist, selectedStartDate, setSelectedStartDate, clearError, getAvailableDates, formatDate, formatSelectedDate }: Props) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  if (!selectedDaysExist) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>Subscription Start Date</Text>

      <Pressable style={styles.dateBox} onPress={() => { if (getAvailableDates().length > 0) setShowDatePicker(true); }}>
        <MaterialIcons name="calendar-month" size={22} color={PRIMARY} />
        <Text style={styles.dateText}>{selectedStartDate ? formatSelectedDate(selectedStartDate) : 'Select start date'}</Text>
        <MaterialIcons name="expand-more" size={22} color="#999" />
      </Pressable>

      <Modal animationType="slide" transparent visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Start Date</Text>
              <Pressable onPress={() => setShowDatePicker(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </Pressable>
            </View>

            <ScrollView style={styles.datePickerContent}>
              {getAvailableDates().map((date, index) => {
                const isSelected = selectedStartDate && date.toDateString() === selectedStartDate.toDateString();
                return (
                  <Pressable
                    key={index}
                    style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                    onPress={() => { setSelectedStartDate(date); setShowDatePicker(false); clearError(); }}
                  >
                    <Text style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>{formatDate(date)}</Text>
                  </Pressable>
                );
              })}
              {getAvailableDates().length === 0 && (
                <Text style={styles.noDateText}>Please select delivery days first to see available dates</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 5, marginBottom: 10 },
  dateBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  dateText: { flex: 1, marginLeft: 10, fontWeight: '500' },
  datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  datePickerModal: { backgroundColor: '#fff', borderRadius: 16, margin: 20, maxHeight: '70%', width: '90%' },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  datePickerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  datePickerContent: { maxHeight: 300 },
  dateOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dateOptionSelected: { backgroundColor: PRIMARY },
  dateOptionText: { fontSize: 16, color: '#000', fontWeight: '500' },
  dateOptionTextSelected: { color: '#fff', fontWeight: '700' },
  noDateText: { padding: 20, textAlign: 'center', color: '#666', fontStyle: 'italic' },
});
