import { Pressable, StyleSheet, View } from "react-native";

import { spacing, type ThemeColors } from "../constants/theme";
import { useAppTheme } from "../context/ThemeContext";
import type { DiaryCollection } from "../types/collection";
import { ThemedText as Text } from "./ThemedText";

type CollectionSelectorProps = {
  collections: DiaryCollection[];
  selectedCollectionId?: string;
  allowNone?: boolean;
  onSelect: (collectionId: string | undefined) => void;
};

export function CollectionSelector({
  collections,
  selectedCollectionId,
  allowNone = false,
  onSelect,
}: CollectionSelectorProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  if (!collections.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>아직 선택할 모음집이 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {allowNone ? (
        <Pressable
          accessibilityLabel="모음집 없음"
          accessibilityRole="button"
          onPress={() => onSelect(undefined)}
          style={[
            styles.chip,
            !selectedCollectionId && styles.chipSelected,
          ]}
        >
          <Text style={[styles.chipText, !selectedCollectionId && styles.chipTextSelected]}>
            없음
          </Text>
        </Pressable>
      ) : null}
      {collections.map((collection) => {
        const selected = collection.id === selectedCollectionId;
        return (
          <Pressable
            accessibilityLabel={`${collection.title} 모음집 선택`}
            accessibilityRole="button"
            key={collection.id}
            onPress={() => onSelect(collection.id)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text numberOfLines={1} style={[styles.chipText, selected && styles.chipTextSelected]}>
              {collection.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      maxWidth: "100%",
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontWeight: "700",
    },
    chipTextSelected: {
      color: colors.surface,
    },
    empty: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: spacing.md,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
    },
  });
