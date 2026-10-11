import Link from "next/link";

/** Subtle "previous page" action shown at the top of each page. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-8 inline-flex items-center gap-2 text-xs font-medium text-faint transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <span aria-hidden>←</span> Previous · {label}
    </Link>
  );
}
