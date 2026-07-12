import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';

export function ThemedText({ style, ...props }: TextProps) {
  const { colors } = useAppTheme();
  const flattenedStyle = StyleSheet.flatten(style);
  const hasFixedFont = Boolean(flattenedStyle?.fontFamily);

  return (
    <NativeText
      {...props}
      style={[
        style,
        {
          fontFamily: hasFixedFont ? flattenedStyle.fontFamily : colors.fontFamily,
          fontWeight: flattenedStyle?.fontWeight,
        },
      ]}
    />
  );
}
