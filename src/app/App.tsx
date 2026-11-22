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
import { MatchPickScreen } from './screens/MatchPickScreen';
import { MatchResultScreen } from './screens/MatchResultScreen';
import { MuhurthamScreen } from './screens/MuhurthamScreen';
import { MuhurthamDetailScreen } from './screens/MuhurthamDetailScreen';
import { NewHouseScreen } from './screens/NewHouseScreen';
import { JobScreen } from './screens/JobScreen';
import { IncomeScreen } from './screens/IncomeScreen';
import s from './App.module.css';

/** Full-screen flows opened from a tab (own header, no bottom nav). */
function subScreen(r: Route) {
  if (r.tab === 'wishes' && r.rest[0] === 'marriage') return r.rest[1] === 'result' ? <MatchResultScreen /> : <MatchPickScreen />;
  // Muhurtham routes carry only the civil date of a result, never who it is for.
  const isDate = (x?: string) => !!x && /^\d{4}-\d{2}-\d{2}$/.test(x);
  if (r.tab === 'wishes' && r.rest[0] === 'muhurtham') return isDate(r.rest[1]) ? <MuhurthamDetailScreen key={r.rest[1]} date={r.rest[1]!} base="muhurtham" /> : <MuhurthamScreen />;
  if (r.tab === 'wishes' && r.rest[0] === 'job') return <JobScreen />;
  if (r.tab === 'wishes' && r.rest[0] === 'income') return <IncomeScreen />;
  if (r.tab === 'wishes' && r.rest[0] === 'house') return isDate(r.rest[1]) ? <MuhurthamDetailScreen key={r.rest[1]} date={r.rest[1]!} base="house" /> : <NewHouseScreen />;
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
