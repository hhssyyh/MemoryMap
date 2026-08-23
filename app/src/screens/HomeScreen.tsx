import { useMemo, useState } from "react";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import {
  Image,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FullscreenMapModal } from "../components/FullscreenMapModal";
import { MemoryBottomSheet } from "../components/MemoryBottomSheet";
import { spacing, type ThemeColors } from "../constants/theme";
import { useDiaries } from "../context/DiaryContext";
import { useAppTheme } from "../context/ThemeContext";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { usePhotoMapMarkers } from "../hooks/usePhotoMapMarkers";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { DiaryPoint } from "../types/diary";
import { ThemedText as Text } from "../components/ThemedText";

const homeBackground = require("../../assets/home_paris.jpg");

const markerPositions = [
  { left: "9%", top: "39%" },
  { left: "39%", top: "31%" },
  { left: "60%", top: "58%" },
] as const;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { points } = useDiaries();
  const photoMapMarkers = usePhotoMapMarkers(points);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const currentLocation = useCurrentLocation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const diaryCount = useMemo(
    () => points.reduce((total, point) => total + point.diaries.length, 0),
    [points],
  );
  const selectedPoint = useMemo(
    () => points.find((point) => point.id === selectedPointId) ?? null,
    [points, selectedPointId],
  );

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />
      <ImageBackground
        resizeMode="cover"
        source={homeBackground}
        style={styles.background}
      >
        <View style={styles.imageWash} />

        <View
          style={[styles.heroHeader, { paddingTop: insets.top + spacing.lg }]}
        >
          <Text style={styles.greeting}>{getGreeting()}, Seoyeon</Text>
          <Text style={styles.summary}>
            {diaryCount} memories, {points.length} places
          </Text>
        </View>

        {/* <View style={[styles.controls, { top: insets.top + 88 }]}>
          <Pressable
            accessibilityLabel="전체 지도 열기"
            onPress={() => setIsMapExpanded(true)}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.controlIcon}>⌖</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="현재 위치 확인"
            disabled={currentLocation.isLocating}
            onPress={() => void currentLocation.requestLocation()}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.controlIcon}>
              {currentLocation.isLocating ? "…" : "◎"}
            </Text>
          </Pressable>
        </View> */}

        {points.slice(0, 3).map((point, index) => {
          const diary = point.diaries[0];
          const photoUri = diary?.photoUris?.[0] ?? diary?.photoUri;
          const position = markerPositions[index];

          return (
            <Pressable
              accessibilityLabel={`${point.location} 기록 보기`}
              key={point.id}
              onPress={() => setSelectedPointId(point.id)}
              style={[
                styles.marker,
                position,
                selectedPoint?.id === point.id && styles.markerSelected,
              ]}
            >
              <View style={styles.markerPhotoFrame}>
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.markerPhoto}
                  />
                ) : (
                  <View style={styles.markerPhotoEmpty} />
                )}
              </View>
              <View style={styles.markerPin} />
              <Text numberOfLines={1} style={styles.markerLabel}>
                {point.location}
              </Text>
            </Pressable>
          );
        })}

        {!selectedPoint ? (
          <Pressable
            accessibilityLabel="새 기록 작성"
            onPress={() => navigation.navigate("CreateDiary")}
            style={({ pressed }) => [
              styles.addButton,
              { bottom: insets.bottom + spacing.lg },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.addIcon}>＋</Text>
          </Pressable>
        ) : null}

        <MemoryBottomSheet
          onClose={() => setSelectedPointId(null)}
          onOpenDiary={(diary, location) =>
            navigation.navigate("DiaryDetail", { diary, location })
          }
          point={selectedPoint}
        />
      </ImageBackground>

      <FullscreenMapModal
        currentLocation={currentLocation.coordinate}
        highlightedPointId={selectedPoint?.id}
        isLocating={currentLocation.isLocating}
        onClose={() => setIsMapExpanded(false)}
        onOpenDiaries={(point) => {
          setIsMapExpanded(false);
          setSelectedPointId(point.id);
        }}
        onRequestLocation={currentLocation.requestLocation}
        photoMarkers={photoMapMarkers.markers}
        photoSyncStatus={photoMapMarkers.syncStatus}
        points={points}
        visible={isMapExpanded}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    background: { flex: 1, overflow: "hidden" },
    imageWash: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(244, 224, 235, 0.16)",
    },
    heroHeader: { alignItems: "center", paddingHorizontal: 72 },
    greeting: {
      color: "#3D3542",
      fontFamily: "serif",
      fontSize: 30,
      fontStyle: "italic",
      textAlign: "center",
    },
    summary: {
      color: "#514852",
      fontFamily: "sans-serif",
      fontSize: 15,
      marginTop: 8,
    },
    controls: { gap: 12, position: "absolute", right: spacing.md },
    controlButton: {
      alignItems: "center",
      backgroundColor: "rgba(255, 253, 249, 0.82)",
      borderRadius: 18,
      elevation: 4,
      height: 54,
      justifyContent: "center",
      shadowColor: "#493A4D",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      width: 54,
    },
    controlIcon: { color: "#5C4D5D", fontSize: 27 },
    pressed: { opacity: 0.74, transform: [{ scale: 0.97 }] },
    marker: { alignItems: "center", position: "absolute", width: 104 },
    markerSelected: { transform: [{ scale: 1.1 }] },
    markerPhotoFrame: {
      backgroundColor: "#FFF9FC",
      borderColor: "#FFFFFF",
      borderRadius: 32,
      borderWidth: 3,
      elevation: 5,
      height: 60,
      overflow: "hidden",
      shadowColor: "#55445D",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.24,
      shadowRadius: 7,
      width: 60,
    },
    markerPhoto: { height: "100%", width: "100%" },
    markerPhotoEmpty: { backgroundColor: colors.primarySoft, flex: 1 },
    markerPin: {
      backgroundColor: colors.primary,
      borderColor: "#FFFFFF",
      borderRadius: 7,
      borderWidth: 2,
      height: 14,
      marginTop: -2,
      width: 14,
    },
    markerLabel: {
      color: "#FFF9FC",
      fontSize: 13,
      fontWeight: "700",
      marginTop: 5,
      textShadowColor: "rgba(45, 38, 58, 0.65)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    addButton: {
      alignItems: "center",
      height: 50,
      justifyContent: "center",
      position: "absolute",
      right: spacing.lg,
      width: 50,
    },
    addIcon: {
      color: "#FFFFFF",
      fontSize: 38,
      fontWeight: "700",
      lineHeight: 44,
      textShadowColor: "rgba(35, 22, 27, 0.72)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 5,
    },
  });
