import { RootNavigator } from './src/navigation/RootNavigator';
import { DiaryProvider } from './src/context/DiaryContext';

export default function App() {
  return (
    <DiaryProvider>
      <RootNavigator />
    </DiaryProvider>
  );
}
