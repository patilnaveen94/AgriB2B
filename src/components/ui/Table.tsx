import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from 'react';
import { cx } from '@/lib/utils';

/** Scroll container that keeps wide tables usable on small screens. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="table-scroll">{children}</div>;
}

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cx('w-full min-w-[640px] text-left text-sm', className)} {...rest} />
  );
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cx(
        'whitespace-nowrap border-b border-surface-200 bg-surface-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-surface-500',
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cx('border-b border-surface-100 px-4 py-3 text-surface-700', className)}
      {...rest}
    />
  );
}

export function Tr({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cx('hover:bg-surface-50/70', className)} {...rest} />;
}
