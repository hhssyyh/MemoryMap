import { useMemo, useState } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapSearchOverlay } from '../components/MapSearchOverlay';
import { MemoryBottomSheet } from '../components/MemoryBottomSheet';
import { MemoryMap } from '../components/MemoryMap';
import type { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { useDiaries } from '../context/DiaryContext';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { usePhotoMapMarkers } from '../hooks/usePhotoMapMarkers';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { MapSearchPlace } from '../types/mapSearch';

export function MapScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { points } = useDiaries();
  const photoMapMarkers = usePhotoMapMarkers(points);
  const [diaryListPointId, setDiaryListPointId] = useState<string | null>(null);
  const [highlightedPointId, setHighlightedPointId] = useState<string>();
  const [searchDismissRequestKey, setSearchDismissRequestKey] = useState(0);
  const [searchTarget, setSearchTarget] = useState<MapSearchPlace | null>(null);
  const currentLocation = useCurrentLocation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const diaryListPoint = useMemo(
    () => points.find((point) => point.id === diaryListPointId) ?? null,
    [diaryListPointId, points],
  );

  return (
    <View style={styles.screen}>
      <StatusBar
        backgroundColor="transparent"
        barStyle="dark-content"
        translucent
      />
      <View
        onStartShouldSetResponderCapture={() => {
          setSearchDismissRequestKey((key) => key + 1);
          return false;
        }}
        style={styles.mapLayer}
      >
        <MemoryMap
          currentLocation={currentLocation.coordinate}
          expanded
          highlightedPointId={highlightedPointId}
          isLocating={currentLocation.isLocating}
          onMapInteraction={() => setSearchDismissRequestKey((key) => key + 1)}
          onOpenDiaries={(point) => {
            setHighlightedPointId(point.id);
            setDiaryListPointId(point.id);
          }}
          onRequestLocation={currentLocation.requestLocation}
          photoMarkers={photoMapMarkers.markers}
          photoSyncStatus={photoMapMarkers.syncStatus}
          points={points}
          searchTarget={searchTarget}
          topInset={insets.top}
        />
      </View>
      <MapSearchOverlay
        dismissRequestKey={searchDismissRequestKey}
        onSelectPlace={(place) => {
          setDiaryListPointId(null);
          setHighlightedPointId(undefined);
          setSearchTarget(place);
        }}
        proximity={currentLocation.coordinate}
        topInset={insets.top}
      />
      <MemoryBottomSheet
        onClose={() => {
          setDiaryListPointId(null);
          setHighlightedPointId(undefined);
        }}
        onOpenDiary={(diary, location) => {
          setDiaryListPointId(null);
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
  mapLayer: {
    flex: 1,
  },
});
