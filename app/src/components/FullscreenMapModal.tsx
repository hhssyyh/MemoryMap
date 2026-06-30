import { Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../constants/theme';
import type { DiaryPoint } from '../types/diary';
import { MemoryMap } from './MemoryMap';

type FullscreenMapModalProps = {
  points: DiaryPoint[];
  selectedPoint: DiaryPoint;
  visible: boolean;
  onClose: () => void;
  onOpenDiaries: (point: DiaryPoint) => void;
  onSelectPoint: (point: DiaryPoint) => void;
};

export function FullscreenMapModal({
  points,
  selectedPoint,
  visible,
  onClose,
  onOpenDiaries,
  onSelectPoint,
}: FullscreenMapModalProps) {
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
          expanded
          onOpenDiaries={onOpenDiaries}
          onSelectPoint={onSelectPoint}
          points={points}
          selectedPoint={selectedPoint}
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

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
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
