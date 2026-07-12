import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import * as ImagePicker from 'expo-image-picker';

import { spacing, type ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';

type Props = { photoUri?: string; onChange: (uri: string) => void };

export function DiaryPhotoPicker({ photoUri, onChange }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const openLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 접근 권한이 필요합니다', '설정에서 사진 접근 권한을 허용해 주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.85 });
    if (!result.canceled) onChange(result.assets[0]!.uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('카메라 권한이 필요합니다', '설정에서 카메라 권한을 허용해 주세요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.85 });
    if (!result.canceled) onChange(result.assets[0]!.uri);
  };

  return (
    <View>
      <View style={styles.preview}>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.image} /> : <Text style={styles.empty}>사진을 추가해 주세요</Text>}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => void takePhoto()} style={styles.button}><Text style={styles.buttonText}>사진 촬영</Text></Pressable>
        <Pressable onPress={() => void openLibrary()} style={styles.button}><Text style={styles.buttonText}>보관함에서 선택</Text></Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  preview: { alignItems: 'center', aspectRatio: 4 / 3, backgroundColor: colors.primarySoft, borderRadius: 18, justifyContent: 'center', overflow: 'hidden', width: '100%' },
  image: { height: '100%', width: '100%' }, empty: { color: colors.textMuted, fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  button: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, elevation: 2, flex: 1, padding: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
  buttonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
