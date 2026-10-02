import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function SearchBar({ trendingStores }: { trendingStores: any[] }) {
  const router = useRouter();

  const handlePress = async () => {
    try {
      await AsyncStorage.setItem('@trending_stores', JSON.stringify(trendingStores || []));
    } catch (_) {}
    router.push('/search');
  };

  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.8} onPress={handlePress}>
      <Ionicons name="search" size={22} color="#8b8b8b" style={{ marginLeft: 10 }} />
      <View style={styles.input}>
        <Text style={styles.placeholder}>Search meals</Text>
      </View>
      <TouchableOpacity style={styles.filterBtn} onPress={handlePress}>
        <MaterialIcons name="tune" size={20} color="#8b8b8b" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 1,
    paddingRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  input: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, justifyContent: 'center' },
  placeholder: { fontSize: 16, color: '#9b9b9b' },
  filterBtn: { padding: 8, borderRadius: 8 },
});
