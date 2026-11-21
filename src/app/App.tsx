import { useEffect } from 'react';
import { useSettings } from './store/settings';
import { useRoute, type Tab } from './router';
import { AppHeader } from './components/AppHeader';
import { OfflineBanner } from './components/OfflineBanner';
import { BottomNav } from './components/BottomNav';
import { TodayScreen } from './screens/TodayScreen';
import { WishesScreen } from './screens/WishesScreen';
import { FamilyScreen } from './screens/FamilyScreen';
import { MoreScreen } from './screens/MoreScreen';
import s from './App.module.css';

const SCREENS: Record<Tab, () => React.JSX.Element> = {
  today: TodayScreen,
  wishes: WishesScreen,
  family: FamilyScreen,
  more: MoreScreen,
};

export function App() {
  const lang = useSettings((st) => st.lang);
  const theme = useSettings((st) => st.theme);
  const elder = useSettings((st) => st.elderText);
  const tab = useRoute();

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = theme;
  }, [lang, theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const Current = SCREENS[tab];
  return (
    <div className={['az', `az-${lang}`, elder && 'az-elder', s.app].filter(Boolean).join(' ')}>
      <AppHeader />
      <OfflineBanner />
      <Current />
      <BottomNav active={tab} />
    </div>
  );
}
