import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  LayoutAnimation,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  type LayoutChangeEvent,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiaryListItem } from "../components/DiaryListItem";
import { MemoryMap } from "../components/MemoryMap";
import { spacing, type ThemeColors } from "../constants/theme";
import { useAppTheme } from "../context/ThemeContext";
import { SQLiteCollectionRepository } from "../data/SQLiteCollectionRepository";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { DiaryCollectionDetail } from "../types/collection";
import type { DiaryEntry, DiaryPoint } from "../types/diary";
import { ThemedText as Text } from "../components/ThemedText";

const repository = new SQLiteCollectionRepository();
const requestNoCurrentLocation = async () => undefined;
const placeholderDiaryId = "__collection_drag_placeholder__";

type CollectionDetailStyles = ReturnType<typeof createStyles>;
type DiaryRowLayout = { height: number; y: number };
type ActiveDragState = {
  diary: DiaryEntry;
  offsetY: number;
  rowHeight: number;
  startIndex: number;
  startY: number;
  targetIndex: number;
};

type DraggableDiaryRowProps = {
  diary: DiaryEntry;
  isActive: boolean;
  styles: CollectionDetailStyles;
  onDragCancel: () => void;
  onDragStart: (diaryId: string) => void;
  onMeasure: (diaryId: string, layout: DiaryRowLayout) => void;
  onOpen: () => void;
};

function clampIndex(index: number, total: number) {
  return Math.max(0, Math.min(total - 1, index));
}

function DraggableDiaryRow({
  diary,
  isActive,
  styles,
  onDragCancel,
  onDragStart,
  onMeasure,
  onOpen,
}: DraggableDiaryRowProps) {
  const rowHeightRef = useRef(104);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height, y } = event.nativeEvent.layout;
    rowHeightRef.current = height + spacing.sm;
    onMeasure(diary.id, { height, y });
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.draggableDiaryRow,
        isActive && styles.draggableDiaryRowActive,
      ]}
    >
      <View style={styles.orderedDiaryItem}>
        {isActive ? (
          <View style={[styles.dragPlaceholder, { height: rowHeightRef.current - spacing.sm }]} />
        ) : (
          <DiaryListItem
            diary={diary}
            delayLongPress={140}
            location={diary.location}
            onLongPress={() => onDragStart(diary.id)}
            onPress={() => {
              if (isActive) {
                return;
              }

              onOpen();
            }}
            onPressOut={() => {
              if (isActive) {
                onDragCancel();
              }
            }}
          />
        )}
      </View>
    </View>
  );
}

function formatDateRange(collection: DiaryCollectionDetail) {
  if (!collection.dateRange) return "날짜 없음";

  const start = collection.dateRange.start.slice(0, 10);
  const end = collection.dateRange.end.slice(0, 10);
  return start === end ? start : `${start} - ${end}`;
}

export function CollectionDetailScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CollectionDetail">>();
  const [collection, setCollection] = useState<DiaryCollectionDetail | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDragState>();
  const [activeDragDiaryId, setActiveDragDiaryId] = useState<string>();
  const [isDraggingDiary, setIsDraggingDiary] = useState(false);
  const isDragResponderActiveRef = useRef(false);
  const rowLayoutsRef = useRef<Record<string, DiaryRowLayout>>({});
  const collectionMapPoints = useMemo<DiaryPoint[]>(() => {
    if (!collection) return [];

    return collection.diaries
      .map((diary, index): DiaryPoint | null => {
        if (diary.latitude === undefined || diary.longitude === undefined) {
          return null;
        }

        return {
          id: `collection-${collection.id}-${diary.id}`,
          location: diary.location ?? collection.title,
          coordinate: {
            latitude: diary.latitude,
            longitude: diary.longitude,
          },
          diaries: [{ ...diary, routeOrder: index + 1 }],
        };
      })
      .filter((point): point is DiaryPoint => point !== null);
  }, [collection]);
  const focusCoordinate = collectionMapPoints[0]?.coordinate;

  const refresh = useCallback(async () => {
    setCollection(await repository.getCollection(route.params.collectionId));
  }, [route.params.collectionId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const deleteCollection = () => {
    if (!collection) return;

    Alert.alert("모음집 삭제", "모음집만 삭제되고 기록은 유지됩니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          void repository.deleteCollection(collection.id).then(() => navigation.goBack());
        },
      },
    ]);
  };

  const saveDiaryOrder = async () => {
    if (!collection || !activeDrag) return;

    const nextDiaries = [...collection.diaries];
    const [movedDiary] = nextDiaries.splice(activeDrag.startIndex, 1);
    if (!movedDiary) return;

    nextDiaries.splice(activeDrag.targetIndex, 0, movedDiary);
    const diaryIds = nextDiaries.map((diary) => diary.id);
    LayoutAnimation.configureNext({
      duration: 180,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });
    isDragResponderActiveRef.current = false;
    setIsDraggingDiary(false);
    setActiveDragDiaryId(undefined);
    setActiveDrag(undefined);
    setCollection({ ...collection, diaries: nextDiaries });
    await repository.reorderDiaries(collection.id, diaryIds);
    await refresh();
  };

  const startDiaryDrag = (diaryId: string) => {
    if (!collection) return;

    const startIndex = collection.diaries.findIndex((candidate) => candidate.id === diaryId);
    const diary = collection.diaries[startIndex];
    const layout = rowLayoutsRef.current[diaryId];
    if (startIndex < 0 || !diary || !layout) return;

    setActiveDrag({
      diary,
      offsetY: 0,
      rowHeight: layout.height,
      startIndex,
      startY: layout.y,
      targetIndex: startIndex,
    });
    setActiveDragDiaryId(diaryId);
  };

  const cancelDiaryDrag = () => {
    if (isDragResponderActiveRef.current) return;

    setActiveDrag(undefined);
    setActiveDragDiaryId(undefined);
    setIsDraggingDiary(false);
  };

  const dragPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Boolean(activeDrag) &&
          Math.abs(gesture.dy) > 3 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          isDragResponderActiveRef.current = true;
          setIsDraggingDiary(true);
        },
        onPanResponderMove: (_, gesture) => {
          setActiveDrag((current) => {
            if (!current || !collection) return current;

            const rowHeight = Math.max(current.rowHeight + spacing.sm, 1);
            const offsetFromStart = Math.round(gesture.dy / rowHeight);
            const targetIndex = clampIndex(
              current.startIndex + offsetFromStart,
              collection.diaries.length,
            );

            if (targetIndex !== current.targetIndex) {
              LayoutAnimation.configureNext({
                duration: 320,
                create: {
                  property: LayoutAnimation.Properties.opacity,
                  type: LayoutAnimation.Types.easeInEaseOut,
                },
                delete: {
                  property: LayoutAnimation.Properties.opacity,
                  type: LayoutAnimation.Types.easeInEaseOut,
                },
                update: {
                  springDamping: 0.78,
                  type: LayoutAnimation.Types.spring,
                },
              });
            }

            return { ...current, offsetY: gesture.dy, targetIndex };
          });
        },
        onPanResponderRelease: () => {
          void saveDiaryOrder();
        },
        onPanResponderTerminate: () => {
          void saveDiaryOrder();
        },
      }),
    [activeDrag, collection, saveDiaryOrder],
  );

  const displayedDiaries = useMemo(() => {
    if (!collection) return [];
    if (!activeDrag || !activeDragDiaryId) return collection.diaries;

    const diariesWithoutActive = collection.diaries.filter(
      (diary) => diary.id !== activeDragDiaryId,
    );
    const placeholderDiary: DiaryEntry = {
      ...activeDrag.diary,
      id: placeholderDiaryId,
    };
    const insertIndex = Math.max(
      0,
      Math.min(activeDrag.targetIndex, diariesWithoutActive.length),
    );
    const nextDiaries = [...diariesWithoutActive];
    nextDiaries.splice(insertIndex, 0, placeholderDiary);
    return nextDiaries;
  }, [activeDrag, activeDragDiaryId, collection]);

  if (!collection) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.emptyTitle}>모음집을 찾을 수 없어요.</Text>
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.emptyButton}
        >
          <Text style={styles.emptyButtonText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={!isDraggingDiary}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {collection.coverPhotoUri ? (
            <Image source={{ uri: collection.coverPhotoUri }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderText}>MEMORY</Text>
            </View>
          )}
          <View style={styles.heroShade} />
          <View style={[styles.heroActions, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable
              accessibilityLabel="뒤로 가기"
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Text style={styles.iconButtonText}>‹</Text>
            </Pressable>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityLabel="모음집 편집"
                accessibilityRole="button"
                onPress={() => Alert.alert("모음집 편집", "편집 화면은 다음 작업에서 연결합니다.")}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <Text style={styles.iconButtonText}>✎</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="모음집 삭제"
                accessibilityRole="button"
                onPress={deleteCollection}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <Text style={styles.iconButtonText}>×</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.eyebrow}>COLLECTION</Text>
            <Text numberOfLines={2} style={styles.title}>
              {collection.title}
            </Text>
            <Text style={styles.meta}>
              {collection.diaryCount}개의 기록 · {formatDateRange(collection)}
            </Text>
          </View>
        </View>

        {collection.description ? (
          <Text style={styles.description}>{collection.description}</Text>
        ) : null}

        {collectionMapPoints.length > 0 ? (
          <View style={styles.mapSection}>
            <MemoryMap
              compact
              currentLocation={null}
              focusCoordinate={focusCoordinate}
              isLocating={false}
              minimumHeight={280}
              onRequestLocation={requestNoCurrentLocation}
              points={collectionMapPoints}
              routeMode="sequence"
            />
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>기록</Text>
          <Text style={styles.sectionCount}>{collection.diaries.length}개</Text>
        </View>

        <View style={styles.diaryList} {...dragPanResponder.panHandlers}>
          {displayedDiaries.map((diary) => (
            <DraggableDiaryRow
              diary={diary}
              isActive={diary.id === placeholderDiaryId}
              key={diary.id}
              onDragCancel={cancelDiaryDrag}
              onDragStart={startDiaryDrag}
              onMeasure={(diaryId, layout) => {
                if (diaryId !== placeholderDiaryId) {
                  rowLayoutsRef.current[diaryId] = layout;
                }
              }}
              onOpen={() =>
                navigation.navigate("DiaryDetail", {
                  diary,
                  location: diary.location ?? collection.title,
                })
              }
              styles={styles}
            />
          ))}
          {activeDrag ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeDragOverlay,
                {
                  height: activeDrag.rowHeight,
                  top: activeDrag.startY,
                  transform: [{ translateY: activeDrag.offsetY }],
                },
              ]}
            >
              <DiaryListItem
                diary={activeDrag.diary}
                location={activeDrag.diary.location}
              />
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    centered: {
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    content: {
      paddingBottom: spacing.xl * 2,
    },
    hero: {
      backgroundColor: colors.primarySoft,
      height: 330,
      overflow: "hidden",
      position: "relative",
    },
    heroImage: {
      height: "100%",
      width: "100%",
    },
    heroPlaceholder: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      flex: 1,
      justifyContent: "center",
    },
    heroPlaceholderText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 1.6,
    },
    heroShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(35, 25, 32, 0.28)",
    },
    heroActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      left: 0,
      paddingHorizontal: spacing.md,
      position: "absolute",
      right: 0,
      top: 0,
    },
    actionRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    iconButton: {
      alignItems: "center",
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    iconButtonText: {
      color: "#FFFFFF",
      fontSize: 30,
      fontWeight: "600",
      lineHeight: 32,
      textShadowColor: "rgba(35, 22, 27, 0.72)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 5,
    },
    pressed: {
      opacity: 0.7,
      transform: [{ scale: 0.96 }],
    },
    heroText: {
      bottom: spacing.lg,
      left: spacing.lg,
      position: "absolute",
      right: spacing.lg,
    },
    eyebrow: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.8,
    },
    title: {
      color: "#FFFFFF",
      fontSize: 34,
      fontWeight: "900",
      marginTop: spacing.xs,
    },
    meta: {
      color: "rgba(255,255,255,0.88)",
      fontSize: 13,
      fontWeight: "700",
      marginTop: spacing.sm,
    },
    description: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    sectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      paddingTop: spacing.lg,
    },
    mapSection: {
      height: 280,
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "900",
    },
    sectionCount: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "800",
    },
    diaryList: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      position: "relative",
    },
    activeDragOverlay: {
      left: spacing.md,
      position: "absolute",
      right: spacing.md,
      zIndex: 20,
    },
    dragPlaceholder: {
      backgroundColor: "rgba(255, 253, 253, 0.42)",
      borderColor: colors.border,
      borderRadius: 18,
      borderStyle: "dashed",
      borderWidth: 1,
    },
    draggableDiaryRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
    },
    draggableDiaryRowActive: {
      zIndex: 9,
    },
    draggableDiaryRowDragging: {
      opacity: 0.96,
      zIndex: 10,
    },
    orderedDiaryItem: {
      flex: 1,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      textAlign: "center",
    },
    emptyButton: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    emptyButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "800",
    },
  });
