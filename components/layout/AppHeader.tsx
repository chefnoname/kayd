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
import { HighBalanceWarningDialog } from "@/components/shared/HighBalanceWarningDialog";
import { UNCOLLECTED_BALANCE_THRESHOLD } from "@/lib/constants";
import styles from "./AppHeader.module.css";

/** sessionStorage key — cleared on logout so fresh login re-triggers the modal. */
const SESSION_KEY = "highBalanceWarningShown";

type HighBalanceAgent = { id: string; name: string; balance_usd: number };

export function AppHeader() {
  const supabase = createClient();
  const router = useRouter();

  const [rate, setRate] = useState<number | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // High-balance warning state
  const [highBalanceAgents, setHighBalanceAgents] = useState<HighBalanceAgent[]>([]);
  const [warningOpen, setWarningOpen] = useState(false);
  const [showWarningBtn, setShowWarningBtn] = useState(false);

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
  // so the badge never shows a stale rate after navigating away.
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

    // Re-fetch rate once the auth session is established (handles initial load
    // where the session may not be ready when the effect first fires).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        fetchRate();
      }
    });

    function onVisible() {
      if (document.visibilityState === "visible") fetchRate();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase]);

  // High-balance check: runs on mount and whenever the tab regains focus.
  // - First trigger this session → shows modal + sets sessionStorage flag
  // - Subsequent triggers → button stays visible but modal does not re-pop
  // - Balance drops below threshold mid-session → button is hidden
  useEffect(() => {
    let cancelled = false;

    async function checkHighBalance() {
      const orgId = await getOrganisationId();
      if (cancelled || !orgId) return;
      const { data } = await supabase
        .from("agents")
        .select("id, name, balance_usd")
        .eq("organisation_id", orgId)
        .eq("status", "active")
        .gte("balance_usd", UNCOLLECTED_BALANCE_THRESHOLD);
      if (cancelled) return;
      const breaching: HighBalanceAgent[] = (data ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        balance_usd: Number(a.balance_usd),
      }));
      if (breaching.length > 0) {
        setShowWarningBtn(true);
        // Only auto-open the modal once per browser session.
        if (!sessionStorage.getItem(SESSION_KEY)) {
          sessionStorage.setItem(SESSION_KEY, "true");
          setHighBalanceAgents(breaching);
          setWarningOpen(true);
        }
      } else {
        // All agents back below threshold — hide the button.
        setShowWarningBtn(false);
      }
    }

    checkHighBalance();

    function onVisible() {
      if (document.visibilityState === "visible") checkHighBalance();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase]);

  /**
   * Re-fetch breaching agents at click time so the modal always shows
   * up-to-date data (never stale from the initial load).
   */
  async function handleWarningClick() {
    const orgId = await getOrganisationId();
    if (!orgId) return;
    const { data } = await supabase
      .from("agents")
      .select("id, name, balance_usd")
      .eq("organisation_id", orgId)
      .eq("status", "active")
      .gte("balance_usd", UNCOLLECTED_BALANCE_THRESHOLD);
    const fresh: HighBalanceAgent[] = (data ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      balance_usd: Number(a.balance_usd),
    }));
    setHighBalanceAgents(fresh);
    if (fresh.length === 0) {
      // Threshold no longer breached — hide the button.
      setShowWarningBtn(false);
    } else {
      setWarningOpen(true);
    }
  }

  async function onLogout() {
    // Clear session flag so the modal fires again on next login.
    sessionStorage.removeItem(SESSION_KEY);
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
        {showWarningBtn && (
          <Button
            variant="outline"
            size="sm"
            className={styles.warningBtn}
            onClick={handleWarningClick}
          >
            ⚠ High Balance
          </Button>
        )}
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

      <HighBalanceWarningDialog
        agents={highBalanceAgents}
        open={warningOpen}
        onOpenChange={setWarningOpen}
      />
    </header>
  );
}
