import { useState } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MemoryBottomSheet } from '../components/MemoryBottomSheet';
import { MemoryMap } from '../components/MemoryMap';
import type { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { useDiaries } from '../context/DiaryContext';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { DiaryPoint } from '../types/diary';

export function MapScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { points } = useDiaries();
  const [diaryListPoint, setDiaryListPoint] = useState<DiaryPoint | null>(null);
  const [highlightedPointId, setHighlightedPointId] = useState<string>();
  const currentLocation = useCurrentLocation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StatusBar
        backgroundColor="transparent"
        barStyle="dark-content"
        translucent
      />
      <MemoryMap
        currentLocation={currentLocation.coordinate}
        expanded
        highlightedPointId={highlightedPointId}
        isLocating={currentLocation.isLocating}
        onOpenDiaries={(point) => {
          setHighlightedPointId(point.id);
          setDiaryListPoint(point);
        }}
        onRequestLocation={currentLocation.requestLocation}
        points={points}
        topInset={insets.top}
      />
      <MemoryBottomSheet
        onClose={() => {
          setDiaryListPoint(null);
          setHighlightedPointId(undefined);
        }}
        onOpenDiary={(diary, location) => {
          setDiaryListPoint(null);
          navigation.navigate('DiaryDetail', { diary, location });
        }}
        point={diaryListPoint}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.map,
    flex: 1,
  },
});
