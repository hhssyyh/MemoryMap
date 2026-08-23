import { RootNavigator } from './src/navigation/RootNavigator';
import { DiaryProvider } from './src/context/DiaryContext';
import { ThemeProvider } from './src/context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <DiaryProvider>
        <RootNavigator />
      </DiaryProvider>
    </ThemeProvider>
  );
}
