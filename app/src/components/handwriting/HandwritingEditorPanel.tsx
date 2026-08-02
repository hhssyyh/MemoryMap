import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, shadows, spacing } from '../../constants/theme';

export type HandwritingPanelSection = 'pages' | 'style' | 'paper' | 'insert' | 'layers';

const SECTIONS: Array<{ value: HandwritingPanelSection; label: string }> = [
  { value: 'pages', label: '페이지' },
  { value: 'style', label: '펜' },
  { value: 'paper', label: '배경' },
  { value: 'insert', label: '삽입' },
  { value: 'layers', label: '레이어' },
];

export function HandwritingEditorPanel({
  visible,
  tablet,
  section,
  onSectionChange,
  onClose,
  children,
}: {
  visible: boolean;
  tablet: boolean;
  section: HandwritingPanelSection;
  onSectionChange: (section: HandwritingPanelSection) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="편집 패널 닫기" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.panel, tablet ? styles.tabletPanel : styles.phonePanel]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>필기 편집</Text>
              <Text style={styles.title}>도구 및 문서 설정</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>완료</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
            style={styles.tabScroll}
          >
            {SECTIONS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => onSectionChange(item.value)}
                style={[styles.tab, section === item.value && styles.tabActive]}
              >
                <Text style={[styles.tabText, section === item.value && styles.tabTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(37, 31, 29, 0.28)' },
  panel: { backgroundColor: colors.surface, overflow: 'hidden', ...shadows.large },
  tabletPanel: { bottom: 16, maxWidth: 420, position: 'absolute', right: 16, top: 16, width: '34%' },
  phonePanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, bottom: 0, height: '72%', left: 0, position: 'absolute', right: 0 },
  header: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  closeButton: { backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  closeText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  tabs: { gap: spacing.sm, padding: spacing.md },
  tabScroll: { flexGrow: 0 },
  tab: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  body: { gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xl },
});
