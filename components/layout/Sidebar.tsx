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
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { toDateString } from "@/lib/utils";
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
  const [role, setRole] = useState<string>("staff");
  const [sendRate, setSendRate] = useState<number | null>(null);
  const [receiveRate, setReceiveRate] = useState<number | null>(null);

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

      // Fetch today's rates
      const orgId = await getOrganisationId();
      if (!orgId || cancelled) return;
      const { data: rateData } = await supabase
        .from("rate_entries")
        .select("send_rate, receive_rate")
        .eq("organisation_id", orgId)
        .eq("date", toDateString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled && rateData) {
        setSendRate(Number(rateData.send_rate));
        setReceiveRate(Number(rateData.receive_rate));
      }
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

      {(sendRate != null || receiveRate != null) && (
        <div className={styles.rateBox}>
          <span className={styles.rateBoxTitle}>Today&apos;s Rates</span>
          {sendRate != null && (
            <div className={styles.rateRow}>
              <span className={styles.rateRowLabel}>Send</span>
              <span className={styles.rateRowValue}>{sendRate.toFixed(4)}</span>
            </div>
          )}
          {receiveRate != null && (
            <div className={styles.rateRow}>
              <span className={styles.rateRowLabel}>Receive</span>
              <span className={styles.rateRowValue}>{receiveRate.toFixed(4)}</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
