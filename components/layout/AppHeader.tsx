"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getOrganisationId, clearOrganisationCache } from "@/lib/org";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatLongDate, toDateString } from "@/lib/utils";
import { startOnboardingTour } from "@/lib/tour";
import "driver.js/dist/driver.css";
import { Button } from "@/components/ui/button";
import styles from "./AppHeader.module.css";

export function AppHeader() {
  const supabase = createClient();
  const router = useRouter();

  const [rate, setRate] = useState<number | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // Fetch identity + name once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user?.email) setEmail(user.email);

      if (user) {
        const { data: staffRow } = await supabase
          .from("staff_users")
          .select("name")
          .eq("id", user.id)
          .maybeSingle();
        if (!cancelled && staffRow?.name) setName(staffRow.name);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // Fetch today's rate on mount AND whenever the tab regains focus,
  // so the badge never shows a stale rate after visiting /setup.
  useEffect(() => {
    let cancelled = false;

    async function fetchRate() {
      const today = toDateString();
      const orgId = await getOrganisationId();
      if (cancelled || !orgId) return;
      const { data } = await supabase
        .from("daily_rates")
        .select("gbp_to_usd")
        .eq("organisation_id", orgId)
        .eq("date", today)
        .maybeSingle();
      if (!cancelled) setRate(data ? Number(data.gbp_to_usd) : null);
    }

    fetchRate();

    function onVisible() {
      if (document.visibilityState === "visible") fetchRate();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase]);

  async function onLogout() {
    await supabase.auth.signOut();
    clearOrganisationCache();
    router.push("/login");
    router.refresh();
  }

  const initials = name
    ? name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2)
    : email
      ? email
          .split("@")[0]
          .split(/[.\-_]/)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("")
          .slice(0, 2)
      : "U";

  return (
    <header className={styles.header}>
       <Image
            src="/kayd.png"
            alt="Kayd logo"
            width={175}
            height={0}
            className={styles.logo}
          />

      <div className={styles.meta}>
        <span className={styles.date}>{formatLongDate()}</span>
        <Badge className={styles.rateBadge} data-tour="daily-rate-badge">
          {rate ? `GBP→USD ${rate.toFixed(4)}` : "Rate not set"}
        </Badge>
      </div>

      <div className={styles.user}>
        <Button
          variant="outline"
          size="sm"
          className={styles.howToBtn}
          onClick={() => startOnboardingTour()}
        >
          Tutorial
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={styles.avatarBtn} aria-label="Open user menu">
              <Avatar>
                <AvatarFallback className={styles.avatarFallback}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{name || email || "My account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogout} className={styles.logoutItem}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
