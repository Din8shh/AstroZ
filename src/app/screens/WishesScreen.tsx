// Wishes hub (design/handoff WishesHub.dc.html): every wish is live.
import { WishCard } from '../components/WishCard';
import { useT } from '../i18n';
import { hrefFor } from '../router';
import { Screen } from './Screen';
import s from './Wishes.module.css';

export function WishesScreen() {
  const t = useT();
  return (
    <Screen title="wishes.title" intro="wishes.intro" privacy="privacy.line">
      <div className={s.list}>
        <WishCard icon="rings" title={t('wish.marriage')} subtitle={t('wish.marriageSub')} href={hrefFor('wishes', 'marriage')} />
        <WishCard icon="muhurtham" title={t('wish.muhurtham')} subtitle={t('wish.muhurthamSub')} href={hrefFor('wishes', 'muhurtham')} />
        <WishCard icon="house" title={t('wish.house')} subtitle={t('wish.houseSub')} href={hrefFor('wishes', 'house')} />
        <WishCard icon="briefcase" title={t('wish.job')} subtitle={t('wish.jobSub')} href={hrefFor('wishes', 'job')} />
        <WishCard icon="coins" title={t('wish.income')} subtitle={t('wish.incomeSub')} href={hrefFor('wishes', 'income')} />
      </div>
    </Screen>
  );
}
