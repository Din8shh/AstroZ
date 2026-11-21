// Today: panchangam card, the day ribbon with a "now" marker, and the same periods as a list.
// Layout from design/handoff TodayTe.dc.html. All values come from the engine worker.
import { useState } from 'react';
import type { Anga, LocalTime } from '../../engine/api';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/icons';
import { DayRibbon } from '../components/DayRibbon';
import { YourDay } from '../components/YourDay';
import { useDay, useNow, usePlace } from '../hooks/useDay';
import { useName, useT, type MessageKey } from '../i18n';
import { placeName } from '../places';
import { useSettings } from '../store/settings';
import { chipDate, clockIn, jdNow, shortDate, todayIn } from '../dates';
import s from './TodayScreen.module.css';

const WISHES: { icon: IconName; label: MessageKey; href: string }[] = [
  { icon: 'rings', label: 'wish.marriage', href: '#/wishes/marriage' },
  { icon: 'muhurtham', label: 'wish.muhurtham', href: '#/wishes/muhurtham' },
  { icon: 'house', label: 'wish.house', href: '#/wishes/house' },
  { icon: 'briefcase', label: 'wish.job', href: '#/wishes' },
  { icon: 'coins', label: 'wish.income', href: '#/wishes' },
];

export function TodayScreen() {
  const t = useT();
  const name = useName();
  const lang = useSettings((st) => st.lang);
  const place = usePlace(useSettings((st) => st.homePlaceId));
  const now = useNow();
  const [date, setDate] = useState(() => todayIn(place.tz));
  const day = useDay(date, place);
  const city = placeName(place, lang);

  const hm = (x: LocalTime) => x.time.slice(0, 5);
  const endLabel = (x: LocalTime) => (x.date === date ? hm(x) : `${hm(x)}, ${shortDate(x.date, lang)}`);

  return (
    <main className={s.main} id="main">
      <section className={s.intro}>
        <h1 className={s.title}>{t('today.title')}</h1>
        <div className={s.chips}>
          <span className={s.chip}>
            <span className={s.chipIcon}><Icon name="location" size={20} /></span>
            {city}
          </span>
          <label className={s.chip}>
            <span className={s.chipIcon}><Icon name="calendar" size={20} /></span>
            <span data-testid="today-date">{chipDate(date, lang)}</span>
            <span className={s.chipChevron}><Icon name="chevron-down" size={20} /></span>
            <input
              className={s.dateInput}
              type="date"
              aria-label={t('today.date')}
              value={date}
              onChange={(e) => { if (e.target.value) setDate(e.target.value); }}
            />
          </label>
        </div>
        {day.status === 'ready' ? (
          <>
            <div className={s.facts}>
              <Fact label={t('today.samvatsaram')} value={name(day.panchangam.samvatsara.name)} />
              <Fact
                label={t('today.masam')}
                value={[
                  day.panchangam.masa.adhika ? t('today.adhika') : '',
                  day.panchangam.masa.kshaya ? t('today.kshaya') : '',
                  name(day.panchangam.masa.name),
                ].filter(Boolean).join(' ')}
              />
              <Fact label={t('today.paksham')} value={name(day.panchangam.paksha.name)} />
            </div>
            <p className={s.kicker}>
              {name(day.panchangam.ayana.name)} · {name(day.panchangam.ruthu.name)} · {name(day.panchangam.vara.name)}
            </p>
          </>
        ) : null}
      </section>

      {day.status === 'loading' ? <p className={s.status} role="status">{t('today.calculating')}</p> : null}
      {day.status === 'error' ? <p className={s.status} role="alert">—</p> : null}

      {day.status === 'ready' ? (
        <>
          <section className={`${s.card} ${s.panchangam}`} aria-labelledby="panchangam-h">
            <div className={s.cardHead}>
              <span className={s.goldIcon}><Icon name="palm-leaf" /></span>
              <h2 className={s.h2} id="panchangam-h">{t('today.panchangam')}</h2>
            </div>
            {(
              [
                ['today.tithi', day.panchangam.tithi],
                ['today.nakshatram', day.panchangam.nakshatra],
                ['today.yogam', day.panchangam.yoga],
                ['today.karanam', day.panchangam.karana],
              ] as [MessageKey, Anga[]][]
            ).map(([label, angas], i) => (
              <AngaRow key={label} last={i === 3} label={t(label)} angas={angas} nameOf={name} endLabel={endLabel} t={t} />
            ))}
            <div className={s.sun}>
              <span className={s.sunItem}>
                <span className={s.sunIcon}><Icon name="sunrise" size={20} /></span>
                <span>{t('today.sunrise')} <b className="az-times">{hm(day.panchangam.sunrise)}</b></span>
              </span>
              <span className={s.sunItem}>
                <span className={s.sunIcon}><Icon name="moon" size={20} /></span>
                <span>{t('today.sunset')} <b className="az-times">{hm(day.panchangam.sunset)}</b></span>
              </span>
            </div>
            <span className={s.note}>{t('today.realSunrise', { city })}</span>
          </section>

          <section className={`${s.card} ${s.dayCard}`} aria-labelledby="day-h">
            <div className={s.dayHead}>
              <h2 className={s.h2} id="day-h">{t('today.throughDay')}</h2>
              <p className={s.sub}>{t('today.throughDaySub')}</p>
            </div>
            <DayRibbon
              sunrise={day.panchangam.sunrise}
              sunset={day.panchangam.sunset}
              nextSunrise={day.panchangam.nextSunrise}
              periods={day.periods}
              nowJd={jdNow(now)}
              nowLabel={clockIn(place.tz, now)}
            />
            <div className={s.listHead}><span>{t('today.asList')}</span></div>
            <DayRibbon
              view="list"
              sunrise={day.panchangam.sunrise}
              sunset={day.panchangam.sunset}
              nextSunrise={day.panchangam.nextSunrise}
              periods={day.periods}
              nowJd={jdNow(now)}
            />
          </section>
        </>
      ) : null}

      {day.status === 'ready' ? <YourDay date={date} place={place} periods={day.periods} nowJd={jdNow(now)} /> : null}

      <section className={s.wishes} aria-labelledby="wishes-h">
        <h2 className={s.h2} id="wishes-h">{t('today.yourWishes')}</h2>
        <div className={s.wishGrid}>
          {WISHES.map((w) => (
            <a key={w.label} className={s.wish} href={w.href}>
              <span className={s.wishIcon}><Icon name={w.icon} size={20} /></span>
              <span className={s.wishLabel}>{t(w.label)}</span>
            </a>
          ))}
          <a className={`${s.wish} ${s.seeAll}`} href="#/wishes">
            <Icon name="chevron-right" size={20} />
            <span className={s.wishLabel}>{t('wish.seeAll')}</span>
          </a>
        </div>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.fact}>
      <span className={s.label}>{label}</span>
      <span className={s.value}>{value}</span>
    </div>
  );
}

type AngaRowProps = {
  last: boolean;
  label: string;
  angas: Anga[];
  nameOf: (n: { en: string; te: string | null }) => string;
  endLabel: (x: LocalTime) => string;
  t: ReturnType<typeof useT>;
};

/** The anga current at sunrise, when it ends, and what follows. */
function AngaRow({ last, label, angas, nameOf, endLabel, t }: AngaRowProps) {
  const current = angas[0];
  const next = angas[1];
  if (!current) return null;
  return (
    <div className={last ? `${s.angaRow} ${s.lastRow}` : s.angaRow}>
      <div className={s.angaName}>
        <span className={s.label}>{label}</span>
        <span className={s.angaValue}>{nameOf(current.name)}</span>
      </div>
      <div className={s.angaEnd}>
        <span className={s.until}>
          {renderUntil(t('today.until', { time: '\u0000' }), endLabel(current.end))}
        </span>
        {next ? <span className={s.label}>{t('today.then', { name: nameOf(next.name) })}</span> : null}
      </div>
    </div>
  );
}

/** Puts the time inside the translated "{time} until" phrase with tabular digits. */
function renderUntil(template: string, time: string) {
  const [before, after] = template.split('\u0000');
  return (
    <>
      {before}
      <span className="az-times">{time}</span>
      {after}
    </>
  );
}
