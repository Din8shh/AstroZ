import { ICONS, type IconName } from './icons';

type Props = { name: IconName; size?: number; title?: string; className?: string };

export function Icon({ name, size = 24, title, className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      style={{ flex: 'none', display: 'block' }}
      // Static markup from the design system's icon set (icons.ts), never user input.
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
