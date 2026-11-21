import { useT } from '../i18n';
import { Screen, screenStyles } from './Screen';

/** "More" tab opens Settings (docs/design-mapping.md §4.5). */
export function MoreScreen() {
  const t = useT();
  return (
    <Screen title="settings.title" intro="settings.intro">
      <p className={screenStyles.note}>{t('disclaimer.body')}</p>
    </Screen>
  );
}
