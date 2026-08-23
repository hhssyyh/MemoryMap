import { Dimensions, Platform } from 'react-native';

const TABLET_MIN_DIMENSION_DP = 600;

export function isTablet(): boolean {
  if (Platform.OS === 'ios') {
    return Platform.isPad ?? false;
  }

  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) >= TABLET_MIN_DIMENSION_DP;
}
