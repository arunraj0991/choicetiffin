import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import WeeklyMenuModal from '@/components/common/WeeklyMenuModal';
import COLORS from '@/constants/colors';

export default function CategoryChips({ categories }: { categories: any[] }) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  if (!categories || categories.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Choose From Category</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Text style={styles.viewMenu}>View Menu</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.item}
              activeOpacity={0.8}
              onPress={() => router.push(`/category?id=${item.id}&name=${encodeURIComponent(item.name)}` as any)}
            >
              <View style={styles.imageWrapper}>
                <Image source={{ uri: item.image }} style={styles.image} />
                <View style={styles.overlay} />
                <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <WeeklyMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 15 },
  headingContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 12 },
  heading: { fontSize: 18, fontWeight: '800', color: '#222' },
  viewMenu: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  scroll: { paddingHorizontal: 16 },
  item: { width: 140, marginRight: 12 },
  imageWrapper: { height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative', justifyContent: 'flex-end' },
  image: { width: '100%', height: '100%', resizeMode: 'cover', position: 'absolute', top: 0, left: 0 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    padding: 6,
    zIndex: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
});
