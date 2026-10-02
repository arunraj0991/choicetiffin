import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "@/constants/colors";
import { formatPlanDuration, formatMealDescription, parseMealDescriptionItems, getMealDurationDays, hasMealPrice } from "@/src/utils/format";
import MealPackagePrice from "@/components/home/MealPackagePrice";
import type { HomepageMeal } from "@/src/store/homepageMeals";
import { getMealReviews } from "@/src/api/api";
import { useLanguage } from "@/src/i18n/context";

const STAR_COLOR = "#F5A623";

type Props = {
  visible: boolean;
  item: HomepageMeal | null;
  onClose: () => void;
};

type MealReview = {
  id?: string | number;
  user_name?: string;
  user_img?: string;
  stars?: string | number;
  review_text?: string;
};

type MealReviewData = {
  avg_rating?: string | number;
  total_reviews?: string | number;
  reviews?: MealReview[];
};

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const stars = Math.round(Number(rating) || 0);
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Ionicons
          key={value}
          name={value <= stars ? "star" : "star-outline"}
          size={size}
          color={STAR_COLOR}
        />
      ))}
    </View>
  );
}

export default function MealDetailModal({ visible, item, onClose }: Props) {
  const { t } = useLanguage();
  const hasPrice = hasMealPrice(item?.price);
  const mealId = item?.id ?? item?.uid ?? item?.meal_id;

  const [reviewData, setReviewData] = useState<MealReviewData | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (!visible || !mealId) {
      setReviewData(null);
      return;
    }

    let cancelled = false;
    setLoadingReviews(true);
    getMealReviews(String(mealId))
      .then((res) => {
        if (cancelled) return;
        setReviewData(res?.data ?? res ?? null);
      })
      .catch(() => {
        if (!cancelled) setReviewData(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingReviews(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, mealId]);

  const reviews = Array.isArray(reviewData?.reviews) ? reviewData.reviews : [];
  const avgRating = Number(reviewData?.avg_rating || 0);
  const totalReviews = Number(reviewData?.total_reviews || reviews.length || 0);
  const planDuration = formatPlanDuration(
    getMealDurationDays(item),
    item?.price,
  );
  const descriptionItems = parseMealDescriptionItems(item?.description);
  const descriptionText = formatMealDescription(item?.description);
  const badge = String(item?.badge ?? "").trim();
  const showBadge = !!badge && badge.toLowerCase() !== "null" && badge.toLowerCase() !== "none";

  return (
    <Modal
      visible={visible && !!item}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.content}>
              {showBadge && (
                <View style={styles.promoBadge}>
                  <Ionicons name="flame" size={11} color="#fff" />
                  <Text style={styles.promoBadgeText} numberOfLines={1}>
                    {badge}
                  </Text>
                </View>
              )}
              {!!item?.name && (
                <Text style={styles.title}>{item.name}</Text>
              )}

              {hasPrice && (
                <View style={{ marginBottom: 8 }}>
                  <MealPackagePrice item={item} showDiscount hideUnitPrice />
                </View>
              )}

              {!!planDuration && (
                <Text style={styles.planDuration}>{planDuration}</Text>
              )}

              {descriptionItems.length > 0 ? (
                <View style={styles.descItems}>
                  {descriptionItems.map((row, index) => (
                    <Text key={`${row.name}-${index}`} style={styles.description}>
                      {row.qty ? `${row.qty} ${row.name}` : row.name}
                    </Text>
                  ))}
                </View>
              ) : (
                !!descriptionText && (
                  <Text style={styles.description}>{descriptionText}</Text>
                )
              )}
            </View>

            {item?.img ? (
              <Image source={{ uri: item.img }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]} />
            )}
          </View>

          <View style={styles.reviewsSection}>
            <Text style={styles.reviewsTitle}>{t("ratingsReviews")}</Text>

            {loadingReviews ? (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={{ marginTop: 8 }}
              />
            ) : (
              <>
                <View style={styles.avgRow}>
                  <Text style={styles.avgRating}>
                    {avgRating > 0 ? avgRating.toFixed(1) : "0.0"}
                  </Text>
                  <StarRow rating={avgRating} size={16} />
                  <Text style={styles.reviewCount}>({totalReviews})</Text>
                </View>

                {reviews.length === 0 ? (
                  <Text style={styles.emptyReviews}>{t("noReviews")}</Text>
                ) : (
                  <ScrollView
                    style={styles.reviewList}
                    contentContainerStyle={{ paddingBottom: 4 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {reviews.map((review, index) => {
                      const name = review?.user_name || "User";
                      const stars = Number(review?.stars || 0);
                      const photo = review?.user_img;
                      const hasPhoto = !!photo && /^https?:\/\//i.test(photo);
                      return (
                        <View
                          key={String(review?.id ?? index)}
                          style={styles.reviewItem}
                        >
                          {hasPhoto ? (
                            <Image
                              source={{ uri: photo }}
                              style={styles.avatar}
                            />
                          ) : (
                            <View style={styles.avatarFallback}>
                              <Text style={styles.avatarLetter}>
                                {name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.reviewBody}>
                            <View style={styles.reviewHeader}>
                              <Text style={styles.reviewerName} numberOfLines={1}>
                                {name}
                              </Text>
                              <StarRow rating={stars} />
                            </View>
                            {!!review?.review_text && (
                              <Text style={styles.reviewText}>
                                {review.review_text}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  content: {
    flex: 1,
    paddingRight: 4,
    paddingTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    paddingRight: 20,
  },
  promoBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EA580C",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: "100%",
  },
  promoBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  planDuration: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
  },
  descItems: {
    gap: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.muted,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.secondary,
  },
  reviewsSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  reviewsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },
  avgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  avgRating: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
  },
  emptyReviews: {
    fontSize: 13,
    color: COLORS.muted,
  },
  reviewList: {
    maxHeight: 220,
  },
  reviewItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEE6F7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  reviewBody: { flex: 1 },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  reviewerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.muted,
  },
});
