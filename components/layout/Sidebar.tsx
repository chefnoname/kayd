"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Banknote,
  PiggyBank,
  MapPin,
  CalendarCheck,
  Settings,
  Shield,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
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
  { href: "/settlement", label: "Settlement", icon: Banknote },
  { href: "/deposits", label: "Deposits", icon: PiggyBank },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/end-of-day", label: "End of Day", icon: CalendarCheck },
  { href: "/setup", label: "Setup", icon: Settings },
  { href: "/admin", label: "Admin", icon: Shield, roles: ["superadmin"] },
  {
    href: "/admin/team",
    label: "My Team",
    icon: UsersRound,
    roles: ["admin"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("staff");

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
    </aside>
  );
}
