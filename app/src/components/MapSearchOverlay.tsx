import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { spacing, type ThemeColors } from "../constants/theme";
import { useAppTheme } from "../context/ThemeContext";
import {
  createMapSearchSessionToken,
  retrieveMapPlace,
  suggestMapPlaces,
} from "../data/MapboxSearchService";
import type {
  MapSearchCoordinate,
  MapSearchPlace,
  MapSearchSuggestion,
} from "../types/mapSearch";
import { ThemedText as Text } from "./ThemedText";

type MapSearchOverlayProps = {
  dismissRequestKey?: number;
  proximity?: MapSearchCoordinate | null;
  topInset: number;
  onSelectPlace: (place: MapSearchPlace) => void;
};

export function MapSearchOverlay({
  dismissRequestKey = 0,
  proximity,
  topInset,
  onSelectPlace,
}: MapSearchOverlayProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const sessionTokenRef = useRef(createMapSearchSessionToken());
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapSearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isPanelDismissed, setIsPanelDismissed] = useState(false);

  useEffect(() => {
    if (dismissRequestKey === 0) {
      return;
    }

    setIsPanelDismissed(true);
    setSuggestions([]);
    setErrorMessage(undefined);
    setIsLoading(false);
    Keyboard.dismiss();
  }, [dismissRequestKey]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (isPanelDismissed || trimmedQuery.length < 2) {
      setSuggestions([]);
      setErrorMessage(undefined);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setIsLoading(true);
      setErrorMessage(undefined);

      void suggestMapPlaces(trimmedQuery, {
        proximity,
        sessionToken: sessionTokenRef.current,
        signal: controller.signal,
      })
        .then(setSuggestions)
        .catch((error) => {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }

          setSuggestions([]);
          setErrorMessage("장소를 불러오지 못했어요.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, 280);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isPanelDismissed, proximity, query]);

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setErrorMessage(undefined);
    setSelectedSuggestionId(undefined);
    setIsPanelDismissed(false);
    sessionTokenRef.current = createMapSearchSessionToken();
  };

  const selectSuggestion = async (suggestion: MapSearchSuggestion) => {
    setSelectedSuggestionId(suggestion.id);
    setErrorMessage(undefined);

    try {
      const place = await retrieveMapPlace(suggestion, {
        proximity,
        sessionToken: sessionTokenRef.current,
      });
      setQuery(place.name);
      setSuggestions([]);
      setIsPanelDismissed(true);
      Keyboard.dismiss();
      onSelectPlace(place);
      sessionTokenRef.current = createMapSearchSessionToken();
    } catch {
      setErrorMessage("선택한 장소의 위치를 찾지 못했어요.");
    } finally {
      setSelectedSuggestionId(undefined);
    }
  };

  const shouldShowPanel =
    !isPanelDismissed &&
    query.trim().length >= 2 &&
    (isLoading || suggestions.length > 0 || Boolean(errorMessage));

  return (
    <View pointerEvents="box-none" style={[styles.container, { top: topInset + 12 }]}>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="지도 장소 검색"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(value) => {
            setQuery(value);
            setIsPanelDismissed(false);
          }}
          placeholder="장소, 주소 검색"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
        {isLoading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : query ? (
          <Pressable
            accessibilityLabel="검색어 지우기"
            accessibilityRole="button"
            hitSlop={8}
            onPress={clearSearch}
          >
            <Text style={styles.clearIcon}>×</Text>
          </Pressable>
        ) : null}
      </View>

      {shouldShowPanel ? (
        <View style={styles.resultPanel}>
          {errorMessage ? (
            <Text style={styles.messageText}>{errorMessage}</Text>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <Pressable
                accessibilityLabel={`${suggestion.name} 위치로 이동`}
                accessibilityRole="button"
                disabled={selectedSuggestionId === suggestion.id}
                key={suggestion.id}
                onPress={() => void selectSuggestion(suggestion)}
                style={({ pressed }) => [
                  styles.resultRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.resultIcon}>
                  <Text style={styles.resultIconText}>⌖</Text>
                </View>
                <View style={styles.resultText}>
                  <Text numberOfLines={1} style={styles.resultName}>
                    {suggestion.name}
                  </Text>
                  {suggestion.address ? (
                    <Text numberOfLines={1} style={styles.resultAddress}>
                      {suggestion.address}
                    </Text>
                  ) : null}
                </View>
                {selectedSuggestionId === suggestion.id ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : null}
              </Pressable>
            ))
          ) : (
            <Text style={styles.messageText}>검색 중...</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      left: spacing.md,
      position: "absolute",
      right: spacing.md,
      zIndex: 20,
    },
    searchBox: {
      alignItems: "center",
      backgroundColor: "rgba(255, 253, 249, 0.96)",
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      elevation: 6,
      flexDirection: "row",
      minHeight: 52,
      paddingHorizontal: spacing.md,
      shadowColor: "#493A4D",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    searchIcon: {
      color: colors.primary,
      fontSize: 24,
      marginRight: spacing.sm,
    },
    input: {
      color: colors.text,
      flex: 1,
      fontSize: 16,
      minHeight: 52,
      paddingVertical: 0,
    },
    clearIcon: {
      color: colors.textMuted,
      fontSize: 26,
      lineHeight: 29,
    },
    resultPanel: {
      backgroundColor: "rgba(255, 253, 249, 0.98)",
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      elevation: 5,
      marginTop: spacing.sm,
      overflow: "hidden",
      shadowColor: "#493A4D",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    },
    resultRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 58,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    resultIcon: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: 15,
      height: 30,
      justifyContent: "center",
      width: 30,
    },
    resultIconText: {
      color: colors.primary,
      fontSize: 17,
      fontWeight: "800",
      lineHeight: 19,
    },
    resultText: {
      flex: 1,
    },
    resultName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
    },
    resultAddress: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    messageText: {
      color: colors.textMuted,
      fontSize: 13,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      textAlign: "center",
    },
    pressed: {
      opacity: 0.72,
    },
  });
