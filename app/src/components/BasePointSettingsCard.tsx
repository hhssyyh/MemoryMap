import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";

import { ThemedText as Text } from "./ThemedText";
import { spacing, type ThemeColors } from "../constants/theme";
import { useAppTheme } from "../context/ThemeContext";
import { SQLiteBasePointRepository } from "../data/SQLiteBasePointRepository";
import type { BasePoint } from "../types/basePoint";

const basePointRepository = new SQLiteBasePointRepository();

export function BasePointSettingsCard() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [activeBasePoint, setActiveBasePoint] =
    useState<BasePoint | null>(null);
  const [name, setName] = useState("우리 집");
  const [radiusText, setRadiusText] = useState("150");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadBasePoint() {
      try {
        const basePoint =
          await basePointRepository.getActiveBasePoint();

        if (!isMounted || !basePoint) {
          return;
        }

        setActiveBasePoint(basePoint);
        setName(basePoint.name);
        setRadiusText(String(basePoint.radiusMeters));
        setLatitude(basePoint.latitude);
        setLongitude(basePoint.longitude);
      } catch {
        if (isMounted) {
          Alert.alert(
            "불러오기 실패",
            "저장된 BasePoint를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBasePoint();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleUseCurrentLocation() {
    setIsLocating(true);

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (
        permission.status !==
        Location.PermissionStatus.GRANTED
      ) {
        Alert.alert(
          "위치 권한 필요",
          "현재 위치를 BasePoint로 설정하려면 위치 권한이 필요합니다.",
        );
        return;
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
    } catch {
      Alert.alert(
        "위치 확인 실패",
        "현재 위치를 가져오지 못했습니다. GPS 설정을 확인해 주세요.",
      );
    } finally {
      setIsLocating(false);
    }
  }

  async function handleSave() {
    const radiusMeters = Number(radiusText);

    if (latitude === null || longitude === null) {
      Alert.alert(
        "위치 필요",
        "먼저 현재 위치를 가져와 주세요.",
      );
      return;
    }

    if (!name.trim()) {
      Alert.alert(
        "이름 필요",
        "BasePoint 이름을 입력해 주세요.",
      );
      return;
    }

    if (
      !Number.isFinite(radiusMeters) ||
      radiusMeters <= 0
    ) {
      Alert.alert(
        "반경 확인",
        "지오펜스 반경을 올바르게 입력해 주세요.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const id = await basePointRepository.saveBasePoint({
        id: activeBasePoint?.id,
        name,
        latitude,
        longitude,
        radiusMeters,
        isActive: true,
      });

      const savedBasePoint =
        await basePointRepository.getBasePoint(id);

      setActiveBasePoint(savedBasePoint);

      Alert.alert(
        "저장 완료",
        "BasePoint가 기기에 저장되었습니다.",
      );
    } catch {
      Alert.alert(
        "저장 실패",
        "BasePoint를 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BASE POINT</Text>

        <View style={styles.card}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>
            저장된 거점을 확인하고 있습니다.
          </Text>
        </View>
      </View>
    );
  }

  const hasCoordinate =
    latitude !== null && longitude !== null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>BASE POINT</Text>

      <View style={styles.card}>
        <View>
          <Text style={styles.cardTitle}>
            기본 거주지
          </Text>
          <Text style={styles.cardDescription}>
            여행의 시작과 종료를 판단할 기준 위치입니다.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            onChangeText={setName}
            placeholder="예: 우리 집"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={name}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            지오펜스 반경(m)
          </Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setRadiusText}
            placeholder="150"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={radiusText}
          />
          <Text style={styles.helpText}>
            처음에는 150m를 권장하며 실제 테스트 후 조정합니다.
          </Text>
        </View>

        <View style={styles.coordinateBox}>
          <Text style={styles.coordinateTitle}>
            선택된 위치
          </Text>

          {hasCoordinate ? (
            <>
              <Text style={styles.coordinateText}>
                위도: {latitude.toFixed(6)}
              </Text>
              <Text style={styles.coordinateText}>
                경도: {longitude.toFixed(6)}
              </Text>
            </>
          ) : (
            <Text style={styles.coordinateEmpty}>
              아직 위치를 선택하지 않았습니다.
            </Text>
          )}
        </View>

        <Pressable
          disabled={isLocating}
          onPress={() => {
            void handleUseCurrentLocation();
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
            isLocating && styles.buttonDisabled,
          ]}
        >
          {isLocating ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>
              현재 위치 가져오기
            </Text>
          )}
        </Pressable>

        <Pressable
          disabled={isSaving}
          onPress={() => {
            void handleSave();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            isSaving && styles.buttonDisabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {activeBasePoint
                ? "BasePoint 수정"
                : "BasePoint 저장"}
            </Text>
          )}
        </Pressable>

        {activeBasePoint ? (
          <View style={styles.savedBadge}>
            <Text style={styles.savedBadgeText}>
              활성 BasePoint 저장됨
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      gap: 12,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.4,
      marginBottom: spacing.xs,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      elevation: 2,
      gap: spacing.md,
      padding: spacing.md,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.07,
      shadowRadius: 8,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
    },
    cardDescription: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.xs,
    },
    field: {
      gap: spacing.sm,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
    },
    input: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      color: colors.text,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    helpText: {
      color: colors.textMuted,
      fontSize: 11,
      lineHeight: 16,
    },
    coordinateBox: {
      backgroundColor: colors.primarySoft,
      borderRadius: 14,
      gap: 4,
      padding: 12,
    },
    coordinateTitle: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 2,
    },
    coordinateText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    coordinateEmpty: {
      color: colors.textMuted,
      fontSize: 12,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 14,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: colors.surface,
      fontSize: 14,
      fontWeight: "800",
    },
    secondaryButton: {
      alignItems: "center",
      borderColor: colors.primary,
      borderRadius: 14,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 16,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "800",
    },
    buttonPressed: {
      opacity: 0.75,
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    savedBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.primarySoft,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    savedBadgeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "800",
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: "center",
    },
  });
  /*화면 진입 시 활성 BasePoint 조회
기존 BasePoint가 있으면 입력창에 표시
버튼을 눌렀을 때만 위치 권한 요청
GPS로 현재 좌표 가져오기
이름·좌표·반경을 SQLite에 저장
이미 저장돼 있으면 동일한 BasePoint를 수정*/