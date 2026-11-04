import { Image, Pressable, StyleSheet, View } from "react-native";

import { spacing, type ThemeColors } from "../constants/theme";
import { useAppTheme } from "../context/ThemeContext";
import type { DiaryCollection } from "../types/collection";
import { ThemedText as Text } from "./ThemedText";

type CollectionCardProps = {
  collection: DiaryCollection;
  selected?: boolean;
  onPress?: () => void;
};

function formatDateRange(collection: DiaryCollection) {
  if (!collection.dateRange) return "날짜 없음";

  const start = collection.dateRange.start.slice(0, 10);
  const end = collection.dateRange.end.slice(0, 10);
  return start === end ? start : `${start} - ${end}`;
}

export function CollectionCard({
  collection,
  selected = false,
  onPress,
}: CollectionCardProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityLabel={`${collection.title} 모음집 보기`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cover}>
        {collection.coverPhotoUri ? (
          <Image source={{ uri: collection.coverPhotoUri }} style={styles.coverImage} />
        ) : (
          <Text style={styles.coverPlaceholder}>MEMORY</Text>
        )}
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>
          {collection.title}
        </Text>
        <Text numberOfLines={1} style={styles.dateRange}>
          {formatDateRange(collection)}
        </Text>
        <Text style={styles.count}>{collection.diaryCount}개의 기록</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: "rgba(255, 253, 253, 0.96)",
      borderColor: "rgba(255,255,255,0.95)",
      borderRadius: 16,
      borderWidth: 1,
      elevation: 4,
      overflow: "hidden",
      shadowColor: "#B98D9B",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 13,
      width: 168,
    },
    cardSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.98 }],
    },
    cover: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      height: 114,
      justifyContent: "center",
      width: "100%",
    },
    coverImage: {
      height: "100%",
      width: "100%",
    },
    coverPlaceholder: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.2,
    },
    content: {
      padding: spacing.md,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    dateRange: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 5,
    },
    count: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 10,
    },
  });
