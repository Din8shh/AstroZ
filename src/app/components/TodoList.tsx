import { useId, useState } from 'react';
import { Icon } from './Icon';
import s from './TodoList.module.css';

export type TodoItem = { id: string; text: string; when?: string | undefined; free: boolean };

export function TodoList({ title, items, freeLabel }: { title: string; items: TodoItem[]; freeLabel: string }) {
  const uid = useId();
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <section className={s.todo} data-testid="todos">
      <h3 className={s.title}><span className={s.titleIcon}><Icon name="diya" size={22} /></span>{title}</h3>
      <ul className={s.list}>
        {items.map((it) => {
          const id = `${uid}-${it.id}`;
          return (
            <li key={it.id} className={done[it.id] ? `${s.item} ${s.done}` : s.item}>
              <input type="checkbox" id={id} checked={!!done[it.id]} onChange={() => setDone((d) => ({ ...d, [it.id]: !d[it.id] }))} />
              <label htmlFor={id}>
                <span className={s.box} aria-hidden="true"><Icon name="check" size={18} /></span>
                <span className={s.text}>{it.text}{it.when ? <span className={s.when}>{it.when}</span> : null}</span>
                {it.free ? <span className={s.free}>{freeLabel}</span> : null}
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
