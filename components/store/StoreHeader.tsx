import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Keyboard,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";

interface Props {
  storeName: string;
  onBack: () => void;
  onSearch: () => void;
  onInfo: () => void;
  isSearching: boolean;
  searchValue: string;
  setSearchValue: (v: string) => void;
  onCancelSearch: () => void;
}

export default function StoreHeader({
  storeName,
  onBack,
  onSearch,
  onInfo,
  isSearching,
  searchValue,
  setSearchValue,
  onCancelSearch,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isSearching) inputRef.current?.focus();
  }, [isSearching]);

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
        <MaterialIcons name="arrow-back" size={22} color="#111" />
      </TouchableOpacity>

      {isSearching ? (
        <View style={styles.searchRow}>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Search..."
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <TouchableOpacity onPress={onCancelSearch} style={{ marginLeft: 8 }}>
            <MaterialIcons name="close" size={22} color="#111" />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.title} numberOfLines={1}>
          {storeName || "Loading..."}
        </Text>
      )}

      <View style={styles.right}>
        {!isSearching && (
          <TouchableOpacity style={styles.iconBtn} onPress={onSearch}>
            <MaterialIcons name="search" size={22} color="#111" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.iconBtn} onPress={onInfo}>
          <MaterialIcons name="info-outline" size={22} color="#111" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    justifyContent: "space-between",
    backgroundColor: COLORS.secondary,
  },
  searchRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 44,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    paddingHorizontal: 12,
  },
  right: { flexDirection: "row", alignItems: "center" },
});
