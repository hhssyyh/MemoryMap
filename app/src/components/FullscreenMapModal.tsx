import { Modal, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import type { DiaryPoint } from '../types/diary';
import type { CurrentCoordinate } from '../hooks/useCurrentLocation';
import { MemoryMap } from './MemoryMap';

type FullscreenMapModalProps = {
  points: DiaryPoint[];
  highlightedPointId?: string;
  visible: boolean;
  onClose: () => void;
  onOpenDiaries: (point: DiaryPoint) => void;
  onSelectPoint?: (point: DiaryPoint) => void;
  currentLocation: CurrentCoordinate | null;
  isLocating: boolean;
  onRequestLocation: () => Promise<void>;
};

export function FullscreenMapModal({
  points,
  highlightedPointId,
  visible,
  onClose,
  onOpenDiaries,
  onSelectPoint,
  currentLocation,
  isLocating,
  onRequestLocation,
}: FullscreenMapModalProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}
    >
      <StatusBar hidden />
      <View style={styles.screen}>
        <MemoryMap
          currentLocation={currentLocation}
          expanded
          highlightedPointId={highlightedPointId}
          onOpenDiaries={onOpenDiaries}
          onSelectPoint={onSelectPoint}
          isLocating={isLocating}
          onRequestLocation={onRequestLocation}
          points={points}
          topInset={insets.top}
        />
        <Pressable
          accessibilityLabel="전체화면 지도 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            { top: insets.top + 14 },
            pressed && styles.closeButtonPressed,
          ]}
        >
          <Text style={styles.closeIcon}>×</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 249, 0.82)',
    borderRadius: 20,
    elevation: 5,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    width: 40,
  },
  closeButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  closeIcon: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 30,
  },
});
