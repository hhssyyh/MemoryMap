import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  DefaultTheme,
  NavigationContainer,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import { StyleSheet } from 'react-native';

import type { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { DiaryScreen } from '../screens/DiaryScreen';
import { DiaryDetailScreen } from '../screens/DiaryDetailScreen';
import { Home2Screen } from '../screens/Home2Screen';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CreateDiaryScreen } from '../screens/CreateDiaryScreen';
import { EditDiaryScreen } from '../screens/EditDiaryScreen';
import { SearchDiaryScreen } from '../screens/SearchDiaryScreen';
import { HandwritingEditorScreen } from '../screens/HandwritingEditorScreen';
import { CollectionDetailScreen } from '../screens/CollectionDetailScreen';
import type { DiaryEntry } from '../types/diary';
import { ThemedText as Text } from '../components/ThemedText';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  DiaryDetail: {
    diary: DiaryEntry;
    location: string;
  };
  CreateDiary: undefined;
  EditDiary: { diaryId: string };
  CollectionDetail: { collectionId: string };
  SearchDiary: { tag?: string } | undefined;
  HandwritingEditor: { diary: DiaryEntry };
};

export type RootTabParamList = {
  Home: undefined;
  Home2: undefined;
  Map: undefined;
  Diary: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const tabIcons: Record<keyof RootTabParamList, string> = {
  Home: '⌂',
  Home2: '◇',
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
  const styles = createStyles(useAppTheme().colors);
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
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
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

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen component={MainTabs} name="MainTabs" />
        <Stack.Screen
          component={CreateDiaryScreen}
          name="CreateDiary"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen component={EditDiaryScreen} name="EditDiary" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen component={CollectionDetailScreen} name="CollectionDetail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen component={SearchDiaryScreen} name="SearchDiary" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          component={HandwritingEditorScreen}
          name="HandwritingEditor"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          component={DiaryDetailScreen}
          name="DiaryDetail"
          options={{
            animation: 'slide_from_right',
            presentation: 'card',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function MainTabs() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
      <Tab.Navigator
        initialRouteName="Home"
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
          name="Home"
          options={{ tabBarLabel: '홈', title: '홈' }}
        />
        <Tab.Screen
          component={Home2Screen}
          name="Home2"
          options={{ tabBarLabel: '홈2', title: '홈2' }}
        />
        <Tab.Screen
          component={MapScreen}
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
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scene: {
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
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
