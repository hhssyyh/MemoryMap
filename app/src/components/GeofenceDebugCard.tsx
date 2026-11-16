import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  spacing,
  type ThemeColors,
} from "../constants/theme";
import { useAppTheme } from "../context/ThemeContext";
import { ThemedText as Text } from "./ThemedText";
import { SQLiteBasePointRepository } from "../data/SQLiteBasePointRepository";
import { SQLiteGeofenceEventRepository } from "../data/SQLiteGeofenceEventRepository";
import {
  isBasePointGeofenceRegistered,
  registerActiveBasePointGeofence,
  unregisterBasePointGeofence,
} from "../services/geofenceService";
import {
  getLocationPermissionState,
  type LocationPermissionState,
} from "../services/locationPermissionService";
import type {
  GeofenceEvent,
  GeofenceTransitionType,
} from "../types/geofenceEvent";

const basePointRepository =
  new SQLiteBasePointRepository();

const eventRepository =
  new SQLiteGeofenceEventRepository();

export function GeofenceDebugCard() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [permission, setPermission] =
    useState<LocationPermissionState | null>(null);

  const [registered, setRegistered] =
    useState(false);

  const [events, setEvents] =
    useState<GeofenceEvent[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [
        permissionState,
        registrationState,
        recentEvents,
      ] = await Promise.all([
        getLocationPermissionState(),
        isBasePointGeofenceRegistered(),
        eventRepository.getRecentEvents(20),
      ]);

      setPermission(permissionState);
      setRegistered(registrationState);
      setEvents(recentEvents);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "상태를 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const performRegistration =
    useCallback(async () => {
      setIsLoading(true);

      try {
        const basePoint =
          await registerActiveBasePointGeofence();

        Alert.alert(
          "지오펜스 등록 완료",
          `${basePoint.name} 주변 ${basePoint.radiusMeters}m를 감지합니다.`,
        );

        await refresh();
      } catch (error) {
        Alert.alert(
          "지오펜스 등록 실패",
          error instanceof Error
            ? error.message
            : "지오펜스를 등록하지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [refresh]);

  const handleRegister = useCallback(() => {
    Alert.alert(
      "백그라운드 위치 권한",
      "앱을 보고 있지 않을 때도 외출과 복귀를 감지하려면 위치 권한을 항상 허용해야 합니다.",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "계속",
          onPress: () => {
            void performRegistration();
          },
        },
      ],
    );
  }, [performRegistration]);

  const handleUnregister =
    useCallback(async () => {
      setIsLoading(true);

      try {
        await unregisterBasePointGeofence();
        await refresh();

        Alert.alert(
          "지오펜스 해제",
          "등록된 BasePoint 지오펜스를 해제했습니다.",
        );
      } catch (error) {
        Alert.alert(
          "지오펜스 해제 실패",
          error instanceof Error
            ? error.message
            : "지오펜스를 해제하지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [refresh]);

  const saveManualEvent = useCallback(
    async (
      transitionType: GeofenceTransitionType,
    ) => {
      setIsLoading(true);

      try {
        const basePoint =
          await basePointRepository.getActiveBasePoint();

        if (!basePoint) {
          throw new Error(
            "활성 BasePoint를 먼저 저장해주세요.",
          );
        }

        await eventRepository.saveEvent({
          basePointId: basePoint.id,
          transitionType,
          source: "MANUAL_TEST",
        });

        await refresh();
      } catch (error) {
        Alert.alert(
          "테스트 이벤트 저장 실패",
          error instanceof Error
            ? error.message
            : "이벤트를 저장하지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [refresh],
  );

  const performDeleteEvents =
    useCallback(async () => {
      setIsLoading(true);

      try {
        await eventRepository.deleteAllEvents();
        await refresh();
      } catch (error) {
        Alert.alert(
          "이벤트 삭제 실패",
          error instanceof Error
            ? error.message
            : "이벤트를 삭제하지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [refresh]);

  const handleDeleteEvents = useCallback(() => {
    Alert.alert(
      "테스트 기록 삭제",
      "저장된 지오펜스 이벤트를 모두 삭제할까요?",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            void performDeleteEvents();
          },
        },
      ],
    );
  }, [performDeleteEvents]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        GEOFENCE TEST
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          지오펜스 개발 테스트
        </Text>

        <View style={styles.statusGroup}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              포그라운드 권한
            </Text>
            <Text style={styles.statusValue}>
              {permission?.foregroundGranted
                ? "허용"
                : "미허용"}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              백그라운드 권한
            </Text>
            <Text style={styles.statusValue}>
              {permission?.backgroundGranted
                ? "허용"
                : "미허용"}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              지오펜스 등록
            </Text>
            <Text style={styles.statusValue}>
              {registered ? "등록됨" : "미등록"}
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>
            {errorMessage}
          </Text>
        ) : null}

        <View style={styles.buttonRow}>
          <ActionButton
            disabled={isLoading}
            label="상태 새로고침"
            onPress={() => {
              void refresh();
            }}
            styles={styles}
          />

          <ActionButton
            disabled={isLoading}
            label="지오펜스 등록"
            onPress={handleRegister}
            styles={styles}
          />

          <ActionButton
            disabled={isLoading}
            label="지오펜스 해제"
            onPress={() => {
              void handleUnregister();
            }}
            styles={styles}
          />
        </View>

        <Text style={styles.subTitle}>
          수동 DB 테스트
        </Text>

        <View style={styles.buttonRow}>
          <ActionButton
            disabled={isLoading}
            label="ENTER 저장"
            onPress={() => {
              void saveManualEvent("ENTER");
            }}
            styles={styles}
          />

          <ActionButton
            disabled={isLoading}
            label="EXIT 저장"
            onPress={() => {
              void saveManualEvent("EXIT");
            }}
            styles={styles}
          />

          <ActionButton
            disabled={isLoading}
            label="기록 삭제"
            onPress={handleDeleteEvents}
            styles={styles}
          />
        </View>

        <View style={styles.eventList}>
          <Text style={styles.subTitle}>
            최근 이벤트 ({events.length})
          </Text>

          {events.length === 0 ? (
            <Text style={styles.emptyText}>
              저장된 이벤트가 없습니다.
            </Text>
          ) : (
            events.map((event) => (
              <View
                key={event.id}
                style={styles.eventRow}
              >
                <Text style={styles.eventType}>
                  {event.transitionType}
                </Text>

                <View style={styles.eventContent}>
                  <Text style={styles.eventTime}>
                    {new Date(
                      event.occurredAt,
                    ).toLocaleString("ko-KR")}
                  </Text>

                  <Text style={styles.eventSource}>
                    {event.source}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

type ActionButtonProps = {
  disabled: boolean;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
};

function ActionButton({
  disabled,
  label,
  onPress,
  styles,
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.buttonText}>
        {label}
      </Text>
    </Pressable>
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
      borderRadius: 22,
      elevation: 2,
      padding: spacing.lg,
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
    statusGroup: {
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    statusLabel: {
      color: colors.textMuted,
      fontSize: 13,
    },
    statusValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
    },
    errorText: {
      color: "#c0392b",
      fontSize: 12,
      marginTop: spacing.md,
    },
    buttonRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    button: {
      backgroundColor: colors.primarySoft,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    buttonText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "800",
    },
    subTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
      marginTop: spacing.lg,
    },
    eventList: {
      marginTop: spacing.md,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: spacing.sm,
    },
    eventRow: {
      alignItems: "center",
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    eventType: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "900",
      width: 48,
    },
    eventContent: {
      flex: 1,
    },
    eventTime: {
      color: colors.text,
      fontSize: 12,
    },
    eventSource: {
      color: colors.textMuted,
      fontSize: 10,
      marginTop: 2,
    },
  });