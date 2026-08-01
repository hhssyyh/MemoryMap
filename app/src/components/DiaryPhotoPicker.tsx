import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText as Text } from './ThemedText';
import * as ImagePicker from 'expo-image-picker';

import { spacing, type ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';

type Props = {
  multiple?: boolean;
  photoUri?: string;
  photoUris?: string[];
  onChange: (uri: string) => void;
  onChangeMultiple?: (uris: string[]) => void;
};

export function DiaryPhotoPicker({
  multiple = false,
  photoUri,
  photoUris,
  onChange,
  onChangeMultiple,
}: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const photos = photoUris?.length ? photoUris : photoUri ? [photoUri] : [];

  const updatePhotos = (uris: string[]) => {
    const nextUris = Array.from(new Set(uris.filter(Boolean)));
    if (multiple && onChangeMultiple) {
      onChangeMultiple(nextUris);
      return;
    }
    if (nextUris[0]) onChange(nextUris[0]);
  };

  const openLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 접근 권한이 필요합니다', '설정에서 사진 접근 권한을 허용해 주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: !multiple,
      allowsMultipleSelection: multiple,
      aspect: [4, 3],
      quality: 0.85,
      selectionLimit: multiple ? 8 : 1,
    });
    if (!result.canceled) {
      updatePhotos(multiple ? [...photos, ...result.assets.map((asset) => asset.uri)] : [result.assets[0]!.uri]);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('카메라 권한이 필요합니다', '설정에서 카메라 권한을 허용해 주세요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.85 });
    if (!result.canceled) updatePhotos(multiple ? [...photos, result.assets[0]!.uri] : [result.assets[0]!.uri]);
  };

  const removePhoto = (uri: string) => {
    updatePhotos(photos.filter((photo) => photo !== uri));
  };

  return (
    <View>
      <View style={styles.preview}>
        {photos[0] ? <Image source={{ uri: photos[0] }} style={styles.image} /> : <Text style={styles.empty}>사진을 추가해 주세요</Text>}
      </View>
      {multiple && photos.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoList}
          contentContainerStyle={styles.photoListContent}
        >
          {photos.map((uri, index) => (
            <View key={uri} style={styles.thumbnailWrap}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <View style={styles.thumbnailIndex}>
                <Text style={styles.thumbnailIndexText}>{index + 1}</Text>
              </View>
              <Pressable
                accessibilityLabel="사진 삭제"
                accessibilityRole="button"
                onPress={() => removePhoto(uri)}
                style={({ pressed }) => [styles.removePhotoButton, pressed && styles.pressed]}
              >
                <Text style={styles.removePhotoText}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.actions}>
        <Pressable onPress={() => void takePhoto()} style={styles.button}><Text style={styles.buttonText}>사진 촬영</Text></Pressable>
        <Pressable onPress={() => void openLibrary()} style={styles.button}><Text style={styles.buttonText}>{multiple ? '보관함에서 추가' : '보관함에서 선택'}</Text></Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  preview: { alignItems: 'center', aspectRatio: 4 / 3, backgroundColor: colors.primarySoft, borderRadius: 18, justifyContent: 'center', overflow: 'hidden', width: '100%' },
  image: { height: '100%', width: '100%' }, empty: { color: colors.textMuted, fontSize: 14 },
  photoList: { marginTop: spacing.sm },
  photoListContent: { gap: spacing.sm, paddingRight: spacing.sm },
  thumbnailWrap: { borderRadius: 12, height: 78, overflow: 'hidden', width: 78 },
  thumbnail: { height: '100%', width: '100%' },
  thumbnailIndex: { alignItems: 'center', backgroundColor: 'rgba(55, 42, 48, 0.58)', borderRadius: 10, height: 20, justifyContent: 'center', left: 6, position: 'absolute', top: 6, width: 20 },
  thumbnailIndexText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  removePhotoButton: { alignItems: 'center', backgroundColor: 'rgba(55, 42, 48, 0.68)', borderRadius: 11, height: 22, justifyContent: 'center', position: 'absolute', right: 5, top: 5, width: 22 },
  removePhotoText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', lineHeight: 19 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  button: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, elevation: 2, flex: 1, padding: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
  buttonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
