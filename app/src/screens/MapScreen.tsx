import { useState } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiaryListModal } from '../components/DiaryListModal';
import { MemoryMap } from '../components/MemoryMap';
import { colors } from '../constants/theme';
import { useDiaries } from '../context/DiaryContext';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { DiaryPoint } from '../types/diary';

export function MapScreen() {
  const { points } = useDiaries();
  const [diaryListPoint, setDiaryListPoint] = useState<DiaryPoint | null>(null);
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
        highlightedPointId={diaryListPoint?.id}
        isLocating={currentLocation.isLocating}
        onOpenDiaries={setDiaryListPoint}
        onRequestLocation={currentLocation.requestLocation}
        points={points}
        topInset={insets.top}
      />
      <DiaryListModal
        onClose={() => setDiaryListPoint(null)}
        onOpenDiary={(diary, location) => {
          setDiaryListPoint(null);
          navigation.navigate('DiaryDetail', { diary, location });
        }}
        point={diaryListPoint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.map,
    flex: 1,
  },
});
