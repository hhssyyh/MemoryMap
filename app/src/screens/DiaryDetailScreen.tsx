import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Pressable,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../constants/theme";
import { useDiaries } from "../context/DiaryContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type DiaryDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "DiaryDetail"
>;

export function DiaryDetailScreen({
  navigation,
  route,
}: DiaryDetailScreenProps) {
  const { points } = useDiaries();
  const routeDiary = route.params.diary;
  const point = points.find((item) => item.diaries.some((diary) => diary.id === routeDiary.id));
  const diary = point?.diaries.find((item) => item.id === routeDiary.id) ?? routeDiary;
  const location = point?.location ?? route.params.location;
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View
      style={[
        styles.overlay,
        isExpanded && styles.overlayExpanded,
        {
          paddingBottom: isExpanded
            ? insets.bottom
            : insets.bottom + spacing.lg,
          paddingTop: isExpanded ? insets.top : insets.top + spacing.lg,
        },
      ]}
    >
      <StatusBar
        backgroundColor="transparent"
        barStyle="dark-content"
        translucent
      />
      {!isExpanded ? (
        <Pressable
          accessibilityLabel="기록 상세 닫기"
          onPress={navigation.goBack}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <View style={[styles.card, isExpanded && styles.cardExpanded]}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="기록 상세 닫기"
            accessibilityRole="button"
            hitSlop={8}
            onPress={navigation.goBack}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.closeIcon}>×</Text>
          </Pressable>
          <Text style={styles.headerTitle}>기록</Text>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="기록 수정"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => navigation.navigate("EditDiary", { diaryId: diary.id })}
              style={({ pressed }) => [styles.editButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.editText}>수정</Text>
            </Pressable>
            <Pressable
            accessibilityLabel={
              isExpanded ? "팝업 크기로 축소" : "전체화면으로 확대"
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsExpanded((expanded) => !expanded)}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.expandIcon}>{isExpanded ? "⊡" : "⛶"}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View style={styles.photoContainer}>
            {diary.photoUri ? <Image source={{ uri: diary.photoUri }} style={styles.photo} /> : <Text style={styles.photoEmpty}>사진 없음</Text>}
          </View>
          <Text style={styles.location}>{location}</Text>
          <Text style={styles.title}>{diary.title}</Text>
          <Text style={styles.date}>{diary.date}</Text>

          <View style={styles.divider} />

          <Text style={styles.body}>{diary.summary}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(24, 35, 30, 0.42)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  overlayExpanded: {
    backgroundColor: colors.background,
    paddingHorizontal: 0,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 26,
    elevation: 18,
    height: "60%",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    width: "100%",
  },
  cardExpanded: {
    borderRadius: 0,
    flex: 1,
    height: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  editButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  editText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  closeIcon: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 29,
  },
  buttonPressed: {
    opacity: 0.65,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  expandIcon: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  photoContainer: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    height: 220,
    justifyContent: "center",
    marginBottom: spacing.lg,
    overflow: "hidden",
    width: "100%",
  },
  photo: { height: "100%", width: "100%" },
  photoEmpty: { color: colors.textMuted, fontSize: 14 },
  location: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  date: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.xl,
    width: "100%",
  },
  body: {
    alignSelf: "stretch",
    color: colors.text,
    fontSize: 17,
    lineHeight: 29,
  },
});
