"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Building2, CalendarDays, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { resetToPath } from "@/lib/session-reset";
import styles from "@/app/console/console.module.css";

const LINKS = [
  { href: "/console", label: "Organisations", icon: Building2, match: ["/console", "/console/organisations", "/console/people"] },
  { href: "/console/activity", label: "Activity log", icon: Activity, match: ["/console/activity"] },
  { href: "/console/subscriptions", label: "Subscriptions", icon: CalendarDays, match: ["/console/subscriptions"], later: true },
  { href: "/console/staff", label: "Kayd staff", icon: ShieldCheck, match: ["/console/staff"] },
];

function isActive(pathname: string, match: string[]): boolean {
  return match.some((m) =>
    m === "/console" ? pathname === "/console" : pathname === m || pathname.startsWith(`${m}/`)
  );
}

export function ConsoleNav({ staffName }: { staffName: string }) {
  const pathname = usePathname();

  async function signOut() {
    await createClient().auth.signOut();
    resetToPath("/console/login");
  }

  return (
    <nav aria-label="Console" className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.brandName}>Kayd</span>
        <span className={styles.brandTag}>Console</span>
      </div>
      {LINKS.map(({ href, label, icon: Icon, match, later }) => {
        const active = isActive(pathname, match);
        return (
          <Link
            key={href}
            href={href}
            className={active ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
            {later && <span className={styles.laterTag}>Later</span>}
          </Link>
        );
      })}
      <div className={styles.navFooter}>
        <span>
          Signed in as <strong>{staffName}</strong>
        </span>
        <span className={styles.navFootnote}>Every action here is logged</span>
        <button type="button" className={styles.signOut} onClick={signOut}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
