// Methodology, privacy and disclaimer pages (SPEC §7 screen 12, §12 launch checklist), opened from Settings.
import { SubHeader } from '../components/SubHeader';
import { useT, type MessageKey } from '../i18n';
import { hrefFor } from '../router';
import s from './More.module.css';
import sc from './Screen.module.css';

const PAGES: Record<'method' | 'privacy' | 'disclaimer', { title: MessageKey; paras: MessageKey[] }> = {
  method: { title: 'method.title', paras: ['method.engine', 'method.day', 'method.periods', 'method.match', 'method.muhurtham', 'method.outlook', 'method.limits'] },
  privacy: { title: 'privacy.title', paras: ['privacy.p1', 'privacy.p2', 'privacy.p3', 'privacy.p4'] },
  disclaimer: { title: 'disclaimer.title', paras: ['disclaimer.body'] },
};

export function InfoScreen({ page }: { page: keyof typeof PAGES }) {
  const t = useT();
  const p = PAGES[page];
  return (
    <div className={sc.page}>
      <SubHeader title={t(p.title)} backHref={hrefFor('more')} />
      <main className={sc.main} id="main" data-testid={`info-${page}`}>
        <div className={s.card}>
          <div className={s.row}>
            {p.paras.map((k) => <p key={k} className={s.para}>{t(k)}</p>)}
          </div>
        </div>
      </main>
    </div>
  );
}
