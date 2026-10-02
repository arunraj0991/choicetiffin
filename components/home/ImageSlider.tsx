import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableOpacity,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { resolveImageUrl } from "@/src/api/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BANNER_MARGIN = 16;
const BANNER_WIDTH = SCREEN_WIDTH - BANNER_MARGIN * 2;
const BANNER_HEIGHT = Math.round(BANNER_WIDTH * (9 / 16));
const MIN_BANNER_HEIGHT = Math.round(BANNER_WIDTH * (9 / 21));
const MAX_BANNER_HEIGHT = Math.round(BANNER_WIDTH * (3 / 4));
const SLIDE_MS = 3500;

function bannerUri(banner: any) {
  return (
    resolveImageUrl(banner?.img ?? banner?.image, "banner") ||
    banner?.img ||
    banner?.image ||
    null
  );
}

export default function ImageSlider({ banners }: { banners: any[] }) {
  const listRef = useRef<FlatList>(null);
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [bannerHeight, setBannerHeight] = useState(BANNER_HEIGHT);

  const slides = (Array.isArray(banners) ? banners : [])
    .map((banner, index) => ({
      key: String(banner?.id ?? index),
      uri: bannerUri(banner),
    }))
    .filter((item) => typeof item.uri === "string" && item.uri.length > 0);

  const goTo = (index: number, animated = true) => {
    indexRef.current = index;
    setActiveIndex(index);
    listRef.current?.scrollToIndex({ index, animated });
  };

  useEffect(() => {
    const uri = slides[0]?.uri;
    if (!uri) return;
    Image.getSize(
      uri,
      (width, height) => {
        if (width <= 0 || height <= 0) return;
        const next = Math.round(BANNER_WIDTH * (height / width));
        setBannerHeight(
          Math.min(MAX_BANNER_HEIGHT, Math.max(MIN_BANNER_HEIGHT, next)),
        );
      },
      () => {},
    );
  }, [slides[0]?.uri]);

  useEffect(() => {
    if (slides.length < 2 || fullImage) return;

    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % slides.length;
      goTo(next);
    }, SLIDE_MS);

    return () => clearInterval(timer);
  }, [slides.length, fullImage]);

  if (!slides.length) return null;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(
      e.nativeEvent.contentOffset.x / BANNER_WIDTH,
    );
    if (index < 0 || index >= slides.length) return;
    indexRef.current = index;
    setActiveIndex(index);
  };

  const slideSize = { width: BANNER_WIDTH, height: bannerHeight };

  return (
    <View style={[styles.wrap, slideSize]}>
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        extraData={activeIndex}
        getItemLayout={(_, index) => ({
          length: BANNER_WIDTH,
          offset: BANNER_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={onScrollEnd}
        onScrollToIndexFailed={({ index }) => {
          requestAnimationFrame(() => goTo(index, false));
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => setFullImage(item.uri)}
            style={[styles.slide, slideSize]}
          >
            <Image
              source={{ uri: item.uri }}
              style={[styles.image, slideSize]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      />

      {slides.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {slides.map((item, index) => (
            <View
              key={item.key}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}

      <Modal
        visible={!!fullImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullImage(null)}
      >
        <Pressable style={styles.fullOverlay} onPress={() => setFullImage(null)}>
          <Image
            source={{ uri: fullImage || undefined }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 15,
    marginHorizontal: BANNER_MARGIN,
    backgroundColor: "#f3f0f6",
    borderRadius: 14,
    overflow: "hidden",
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
  },
  image: {},
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    width: 16,
    backgroundColor: "#fff",
  },
  fullOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
