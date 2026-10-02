import { MaterialIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";

import COLORS from "@/constants/colors";

const PRIMARY = COLORS.primary;

export type TooltipMenuItem = {
  key: string;
  label: string;
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  items: TooltipMenuItem[];
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export default function TooltipMenu({
  items,
  accessibilityLabel,
  style,
}: Props) {
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 16 });

  const openMenu = () => {
    setOpen(true);
    const place = (x: number, y: number, width: number, height: number) => {
      const { width: screenWidth } = Dimensions.get("window");
      setPos({
        top: Math.max(8, y + height + 6),
        right: Math.max(12, screenWidth - x - width),
      });
    };
    requestAnimationFrame(() => {
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        if (width || height || x || y) place(x, y, width, height);
      });
    });
  };

  const handleItemPress = (item: TooltipMenuItem) => {
    if (item.disabled) return;
    setOpen(false);
    item.onPress();
  };

  return (
    <View ref={triggerRef} collapsable={false} style={style}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={openMenu}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <MaterialIcons name="more-vert" size={20} color={PRIMARY} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View style={[styles.tooltip, { top: pos.top, right: pos.right }]}>
            <View style={styles.arrow} />
            {items.map((item, idx) => (
              <View key={item.key}>
                {idx > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={[styles.item, item.disabled && styles.itemDisabled]}
                  onPress={() => handleItemPress(item)}
                  disabled={item.disabled}
                >
                  {item.icon ? (
                    <MaterialIcons
                      name={item.icon}
                      size={18}
                      color={item.disabled ? "#bbb" : PRIMARY}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.itemText,
                      item.disabled && styles.itemTextDisabled,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  overlay: {
    flex: 1,
  },
  tooltip: {
    position: "absolute",
    minWidth: 180,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  arrow: {
    position: "absolute",
    top: -6,
    right: 12,
    width: 12,
    height: 12,
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#eee",
    transform: [{ rotate: "45deg" }],
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  itemDisabled: {
    opacity: 0.45,
  },
  itemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#130e1b",
  },
  itemTextDisabled: {
    color: "#999",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 12,
  },
});
