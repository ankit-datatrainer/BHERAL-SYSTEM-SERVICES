/** Shared inner-page hero band with breadcrumbs. */
import Link from 'next/link';
import type { ReactNode } from 'react';

interface Crumb {
  label: string;
  href?: string;
}

export function PageHero({
  title,
  description,
  crumbs = [],
  children,
}: {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="container">
        <div className="breadcrumbs">
          <Link href="/">Home</Link>
          {crumbs.map((c) => (
            <span key={c.label} style={{ display: 'contents' }}>
              <span>/</span>
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
    </section>
  );
}
