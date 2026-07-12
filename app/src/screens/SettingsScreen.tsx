import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, themes, type ThemeColors, type ThemeName } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { ThemedText as Text } from '../components/ThemedText';

const themeOptions: { name: ThemeName; title: string; description: string }[] = [
  { name: 'parisDusk', title: 'Paris Dusk', description: '파우더 블루와 블러시 핑크로 담은 그림 같은 저녁' },
  { name: 'memory', title: 'Memory', description: '크림, 테라코타, 세이지로 만든 따뜻한 기록장' },
  { name: 'forest', title: 'Forest', description: '차분한 초록빛의 산뜻하고 선명한 테마' },
];

export function SettingsScreen() {
  const { colors, setThemeName, themeName } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SETTINGS</Text>
        <Text style={styles.title}>나의 앱 설정</Text>
        <Text style={styles.description}>기록을 보여주는 분위기를 선택해 보세요.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APP THEME</Text>
        {themeOptions.map((option) => {
          const palette = themes[option.name];
          const selected = option.name === themeName;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.name}
              onPress={() => setThemeName(option.name)}
              style={[styles.themeCard, selected && styles.themeCardSelected]}
            >
              <View style={[styles.preview, { backgroundColor: palette.background }]}>
                <View style={[styles.previewSky, { backgroundColor: palette.primarySoft }]} />
                <View style={[styles.previewCloud, { backgroundColor: palette.accent }]} />
                <View style={[styles.previewMap, { backgroundColor: palette.map }]} />
                <View style={[styles.previewMarker, { backgroundColor: palette.primary }]} />
                <View style={[styles.previewCard, { backgroundColor: palette.surface }]} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1, paddingHorizontal: spacing.lg },
  header: { paddingBottom: spacing.xl, paddingTop: spacing.xl },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.8, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  section: { gap: 12 },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: spacing.xs },
  themeCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, elevation: 2, flexDirection: 'row', gap: 14, padding: 14, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8 },
  themeCardSelected: { backgroundColor: colors.primarySoft },
  preview: { borderRadius: 16, height: 72, overflow: 'hidden', position: 'relative', width: 72 },
  previewSky: { height: '48%', width: '100%' },
  previewCloud: { borderRadius: 10, height: 8, opacity: 0.58, position: 'absolute', right: 8, top: 12, width: 25 },
  previewMap: { bottom: 0, height: '52%', position: 'absolute', width: '100%' },
  previewMarker: { borderRadius: 7, height: 14, left: 29, position: 'absolute', top: 14, width: 14 },
  previewCard: { borderRadius: 7, bottom: 7, height: 22, left: 7, position: 'absolute', right: 7 },
  optionText: { flex: 1 },
  optionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  optionDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  radio: { alignItems: 'center', borderColor: colors.border, borderRadius: 11, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  radioSelected: { borderColor: colors.primary },
  radioDot: { backgroundColor: colors.primary, borderRadius: 5, height: 10, width: 10 },
});
