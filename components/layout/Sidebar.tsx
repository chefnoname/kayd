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
  UserCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import styles from "./Sidebar.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
  tourId?: string;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Users, tourId: "nav-agents" },
  {
    href: "/settlement",
    label: "Settlement",
    icon: Banknote,
    tourId: "nav-settlement",
  },
  { href: "/deposits", label: "Deposits", icon: PiggyBank },
  { href: "/locations", label: "Locations", icon: MapPin },
  {
    href: "/end-of-day",
    label: "End of Day",
    icon: CalendarCheck,
    tourId: "nav-end-of-day",
  },
  { href: "/setup", label: "Setup", icon: Settings },
  { href: "/admin", label: "Admin", icon: Shield, roles: ["superadmin"] },
  {
    href: "/admin/team",
    label: "My Team",
    icon: UsersRound,
    roles: ["admin"],
  },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
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
        {visibleNav.map(({ href, label, icon: Icon, tourId }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              data-tour={tourId}
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
