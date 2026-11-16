"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Banknote,
  PiggyBank,
  Truck,
  MapPin,
  CalendarCheck,
  Shield,
  UsersRound,
  UserCircle,
} from "lucide-react";
import { useAtomValue } from "jotai";
import { createClient } from "@/lib/supabase";
import { attentionAtom } from "@/lib/atoms";
import styles from "./Sidebar.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/agent-deposits", label: "Agent Deposits", icon: Banknote },
  { href: "/deposits", label: "Deposits", icon: PiggyBank },
  { href: "/cash-in-transit", label: "HQ Collections", icon: Truck },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/end-of-day", label: "End of Day", icon: CalendarCheck },
  { href: "/admin", label: "Admin", icon: Shield, roles: ["superadmin"] },
  { href: "/admin/team", label: "My Team", icon: UsersRound, roles: ["admin"] },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const attention = useAtomValue(attentionAtom);
  const [role, setRole] = useState<string>("staff");

  // Fetch role once on mount.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("staff_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled && data) setRole(data.role);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // On mobile the nav is a horizontal strip: keep the current page in view.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const current = navRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]'
    );
    current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname, role]);

  const visibleNav = nav.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  // Count badges. The colour says there is an issue and the number says how
  // many; the full wording lives in the accessible label and the tooltip so
  // the badge itself never has text that can wrap or overflow.
  const highCount = attention.highBalanceAgents.length;
  const overdueCount = attention.overdueOffices.length;
  const badges: Record<string, { count: number; tone: string; label: string }> = {};
  if (highCount > 0) {
    badges["/agents"] = {
      count: highCount,
      tone: styles.badgeDanger,
      label: `${highCount} ${highCount === 1 ? "agent is" : "agents are"} over the balance limit`,
    };
  } else if (attention.owingCount > 0) {
    badges["/agents"] = {
      count: attention.owingCount,
      tone: styles.badgeWarning,
      label: `${attention.owingCount} ${attention.owingCount === 1 ? "agent owes" : "agents owe"} money`,
    };
  }
  if (overdueCount > 0) {
    badges["/locations"] = {
      count: overdueCount,
      tone: styles.badgeDanger,
      label: `${overdueCount} ${overdueCount === 1 ? "office is" : "offices are"} overdue a collection`,
    };
  }

  return (
    <aside className={styles.sidebar}>
      <Link href="/dashboard" className={styles.logoLink} aria-label="Kayd dashboard">
        <Image
          src="/kayd-logo.png"
          alt="Kayd"
          width={480}
          height={131}
          className={styles.logo}
          priority
        />
      </Link>
      <nav className={styles.nav} ref={navRef} aria-label="Main">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          const badge = badges[href];
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.link} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} aria-hidden className={styles.icon} />
              <span className={styles.label}>{label}</span>
              {badge && (
                <span
                  className={`${styles.badge} ${badge.tone}`}
                  title={badge.label}
                >
                  <span aria-hidden>{badge.count}</span>
                  <span className={styles.srOnly}>, {badge.label}</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
