"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { rateAtom } from "@/lib/atoms";
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
  const rates = useAtomValue(rateAtom);
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

  const visibleNav = nav.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.link} ${active ? styles.active : ""}`}
            >
              <Icon size={18} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {(rates.sendRate != null || rates.receiveRate != null) && (
        <div className={styles.rateBox}>
          <span className={styles.rateBoxTitle}>Today&apos;s Rates</span>
          {rates.sendRate != null && (
            <div className={styles.rateRow}>
              <span className={styles.rateRowLabel}>Send</span>
              <span className={styles.rateRowValue}>{rates.sendRate.toFixed(4)}</span>
            </div>
          )}
          {rates.receiveRate != null && (
            <div className={styles.rateRow}>
              <span className={styles.rateRowLabel}>Receive</span>
              <span className={styles.rateRowValue}>{rates.receiveRate.toFixed(4)}</span>
            </div>
          )}
          {rates.timestamp && (
            <span className={styles.rateTimestamp}>
              Set{" "}
              {new Date(rates.timestamp).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
