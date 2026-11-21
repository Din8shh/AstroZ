import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import s from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & { variant?: Variant; icon?: IconName; block?: boolean; children: ReactNode };

export const buttonClass = (variant: Variant = 'primary', block = false) => [s.btn, s[variant], block && s.block].filter(Boolean).join(' ');

export function Button({ variant = 'primary', icon, block = false, children, type = 'button', ...rest }: Props) {
  return (
    <button type={type} className={buttonClass(variant, block)} {...rest}>
      {icon ? <Icon name={icon} size={20} /> : null}
      <span>{children}</span>
    </button>
  );
}
