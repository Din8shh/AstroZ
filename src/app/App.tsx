import { useEffect } from 'react';
import { useSettings } from './store/settings';
import { useRoute, type Route } from './router';
import { AppHeader } from './components/AppHeader';
import { OfflineBanner } from './components/OfflineBanner';
import { BottomNav } from './components/BottomNav';
import { TodayScreen } from './screens/TodayScreen';
import { WishesScreen } from './screens/WishesScreen';
import { FamilyScreen } from './screens/FamilyScreen';
import { MoreScreen } from './screens/MoreScreen';
import { PersonFormScreen } from './screens/PersonFormScreen';
import { RevealScreen } from './screens/RevealScreen';
import s from './App.module.css';

/** Full-screen flows opened from a tab (own header, no bottom nav). */
function subScreen(r: Route) {
  if (r.tab !== 'family') return null;
  const [a, b] = r.rest;
  if (a === 'new') return <PersonFormScreen />;
  if (a && b === 'edit') return <PersonFormScreen id={a} />;
  if (a && b === 'reveal') return <RevealScreen id={a} />;
  return null;
}

const TAB_SCREENS = { today: TodayScreen, wishes: WishesScreen, family: FamilyScreen, more: MoreScreen };

export function App() {
  const lang = useSettings((st) => st.lang);
  const theme = useSettings((st) => st.theme);
  const elder = useSettings((st) => st.elderText);
  const route = useRoute();

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = theme;
  }, [lang, theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.tab, route.rest.join('/')]);

  const sub = subScreen(route);
  const Current = TAB_SCREENS[route.tab];
  return (
    <div className={['az', `az-${lang}`, elder && 'az-elder', s.app].filter(Boolean).join(' ')}>
      {sub ?? (
        <>
          <AppHeader />
          <OfflineBanner />
          <Current />
          <BottomNav active={route.tab} />
        </>
      )}
    </div>
  );
}
