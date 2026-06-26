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
import { Button } from "@/components/ui/button";
import { HighBalanceWarningDialog } from "@/components/shared/HighBalanceWarningDialog";
import { UNCOLLECTED_BALANCE_THRESHOLD, RATE_REFRESH_INTERVAL_MS } from "@/lib/constants";
import { useRateGate } from "@/components/shared/RateGateProvider";
import { useAtom } from "jotai";
import { rateAtom } from "@/lib/atoms";
import styles from "./AppHeader.module.css";

/** sessionStorage key — cleared on logout so fresh login re-triggers the modal. */
const SESSION_KEY = "highBalanceWarningShown";

type HighBalanceAgent = { id: string; name: string; balance_usd: number };

export function AppHeader() {
  const supabase = createClient();
  const router = useRouter();
  const { gateCleared } = useRateGate();
  const [rates, setRates] = useAtom(rateAtom);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // Outstanding collections count
  const [outstandingCount, setOutstandingCount] = useState(0);

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

  // Poll rate_entries every 60s and write to the Jotai atom so every
  // consumer (AppHeader badges, Sidebar rate box) stays in sync.
  useEffect(() => {
    if (!gateCleared) return;

    let cancelled = false;

    async function fetchRateEntries() {
      const today = toDateString();
      const orgId = await getOrganisationId();
      if (cancelled || !orgId) return;
      const { data } = await supabase
        .from("rate_entries")
        .select("send_rate, receive_rate, created_at")
        .eq("organisation_id", orgId)
        .eq("date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) {
        setRates({
          sendRate: Number(data.send_rate),
          receiveRate: Number(data.receive_rate),
          timestamp: data.created_at ?? null,
        });
      }
    }

    fetchRateEntries();

    const interval = setInterval(fetchRateEntries, RATE_REFRESH_INTERVAL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") fetchRateEntries();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase, gateCleared, setRates]);

  // Outstanding collections: count of active agents with balance > 0.
  // Refreshes on mount, visibility change, and auth state.
  useEffect(() => {
    if (!gateCleared) return;

    let cancelled = false;

    async function fetchOutstanding() {
      const orgId = await getOrganisationId();
      if (cancelled || !orgId) return;
      const { count } = await supabase
        .from("agents")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", orgId)
        .eq("status", "active")
        .gt("balance_usd", 0);
      if (!cancelled) setOutstandingCount(count ?? 0);
    }

    fetchOutstanding();

    function onVisible() {
      if (document.visibilityState === "visible") fetchOutstanding();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase, gateCleared]);

  // High-balance check: only runs AFTER rate gate is cleared (AC-8).
  // - First trigger this session → shows modal + sets sessionStorage flag
  // - Subsequent triggers → button stays visible but modal does not re-pop
  // - Balance drops below threshold mid-session → button is hidden
  useEffect(() => {
    if (!gateCleared) return;

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
  }, [supabase, gateCleared]);

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
    // Clear session flags so modals fire again on next login.
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("rateGateCleared");
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
        <div className={styles.rateGroup}>
          <Badge className={styles.rateBadge}>
            GBP→USD {rates.sendRate?.toFixed(4) ?? "—"}
          </Badge>
          <Badge className={styles.rateBadge}>
            USD→GBP {rates.receiveRate?.toFixed(4) ?? "—"}
          </Badge>
        </div>
      </div>

      <div className={styles.user}>
        {outstandingCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className={styles.outstandingBtn}
            onClick={() => router.push("/agents?filter=in_debt")}
          >
            ⚠ Collections: {outstandingCount}
          </Button>
        )}
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
