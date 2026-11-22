import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { useT } from './i18n';
import { useSettings } from './store/settings';
import { useRoute, type Route } from './router';
import { AppHeader } from './components/AppHeader';
import { OfflineBanner } from './components/OfflineBanner';
import { BottomNav } from './components/BottomNav';
import { UpdateToast } from './components/UpdateToast';
import { ScreenBoundary } from './components/ScreenBoundary';
import { TodayScreen } from './screens/TodayScreen';
import { WishesScreen } from './screens/WishesScreen';
import { FamilyScreen } from './screens/FamilyScreen';
import { MoreScreen } from './screens/MoreScreen';
// Full-screen flows load on demand (smaller first download; every chunk is precached for offline use).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyNamed = <K extends string>(load: () => Promise<Record<K, ComponentType<any>>>, name: K) =>
  lazy(async () => ({ default: (await load())[name]! }));
const PersonFormScreen = lazyNamed(() => import('./screens/PersonFormScreen'), 'PersonFormScreen') as ComponentType<{ id?: string }>;
const RevealScreen = lazyNamed(() => import('./screens/RevealScreen'), 'RevealScreen') as ComponentType<{ id: string }>;
const MatchPickScreen = lazyNamed(() => import('./screens/MatchPickScreen'), 'MatchPickScreen') as ComponentType;
const MatchResultScreen = lazyNamed(() => import('./screens/MatchResultScreen'), 'MatchResultScreen') as ComponentType;
const MuhurthamScreen = lazyNamed(() => import('./screens/MuhurthamScreen'), 'MuhurthamScreen') as ComponentType;
const MuhurthamDetailScreen = lazyNamed(() => import('./screens/MuhurthamDetailScreen'), 'MuhurthamDetailScreen') as ComponentType<{ date: string; base: 'muhurtham' | 'house' }>;
const NewHouseScreen = lazyNamed(() => import('./screens/NewHouseScreen'), 'NewHouseScreen') as ComponentType;
const JobScreen = lazyNamed(() => import('./screens/JobScreen'), 'JobScreen') as ComponentType;
const IncomeScreen = lazyNamed(() => import('./screens/IncomeScreen'), 'IncomeScreen') as ComponentType;
const InfoScreen = lazyNamed(() => import('./screens/InfoScreen'), 'InfoScreen') as ComponentType<{ page: 'method' | 'privacy' | 'disclaimer' }>;
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
  if (r.tab === 'more' && (r.rest[0] === 'method' || r.rest[0] === 'privacy' || r.rest[0] === 'disclaimer')) return <InfoScreen key={r.rest[0]} page={r.rest[0]} />;
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
      <UpdateToast />
      {sub ? <Boundary key={route.rest.join('/')}><Suspense fallback={<Loading />}>{sub}</Suspense></Boundary> : (
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

function Loading() {
  const t = useT();
  return <p role="status" style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--az-ink-muted)' }}>{t('today.calculating')}</p>;
}

function Boundary({ children }: { children: React.ReactNode }) {
  const t = useT();
  return <ScreenBoundary message={t('error.screen')} retry={t('error.retry')}>{children}</ScreenBoundary>;
}
