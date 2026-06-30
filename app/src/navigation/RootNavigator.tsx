import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StyleSheet, Text } from 'react-native';

import { colors } from '../constants/theme';
import { DiaryScreen } from '../screens/DiaryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type RootTabParamList = {
  Map: undefined;
  Diary: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    border: colors.border,
    card: colors.surface,
    primary: colors.primary,
    text: colors.text,
  },
};

const tabIcons: Record<keyof RootTabParamList, string> = {
  Map: '⌖',
  Diary: '▤',
  Settings: '⚙',
};

type TabIconProps = {
  color: string;
  focused: boolean;
  routeName: keyof RootTabParamList;
};

function TabIcon({ color, focused, routeName }: TabIconProps) {
  return (
    <Text
      style={[
        styles.tabIcon,
        { color },
        focused && styles.tabIconFocused,
      ]}
    >
      {tabIcons[routeName]}
    </Text>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        initialRouteName="Map"
        screenOptions={({ route }) => ({
          headerShown: false,
          sceneStyle: styles.scene,
          tabBarActiveTintColor: colors.primary,
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} routeName={route.name} />
          ),
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: styles.tabBar,
        })}
      >
        <Tab.Screen
          component={HomeScreen}
          name="Map"
          options={{ tabBarLabel: '지도', title: '지도' }}
        />
        <Tab.Screen
          component={DiaryScreen}
          name="Diary"
          options={{ tabBarLabel: '기록', title: '기록' }}
        />
        <Tab.Screen
          component={SettingsScreen}
          name="Settings"
          options={{ tabBarLabel: '설정', title: '설정' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabIcon: {
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 24,
  },
  tabIconFocused: {
    fontWeight: '800',
    transform: [{ scale: 1.08 }],
  },
});
