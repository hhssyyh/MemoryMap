import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../constants/theme';

type ComingSoonScreenProps = {
  description: string;
  eyebrow: string;
  icon: string;
  title: string;
};

export function ComingSoonScreen({
  description,
  eyebrow,
  icon,
  title,
}: ComingSoonScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>준비 중</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 32,
    height: 88,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 88,
  },
  icon: {
    color: colors.primary,
    fontSize: 38,
    fontWeight: '700',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.sm,
    maxWidth: 280,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: spacing.lg,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  badgeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
