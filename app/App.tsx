import { RootNavigator } from './src/navigation/RootNavigator';
import { DiaryProvider } from './src/context/DiaryContext';
import { PhotoLocationSyncProvider } from './src/context/PhotoLocationSyncContext';
import { ThemeProvider } from './src/context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <DiaryProvider>
        <PhotoLocationSyncProvider>
          <RootNavigator />
        </PhotoLocationSyncProvider>
      </DiaryProvider>
    </ThemeProvider>
  );
}
