"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
import { resetToPath } from "@/lib/session-reset";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { daysSince, getLocationStatus, toDateString } from "@/lib/utils";
import { HighBalanceWarningDialog } from "@/components/shared/HighBalanceWarningDialog";
import { UNCOLLECTED_BALANCE_THRESHOLD, RATE_REFRESH_INTERVAL_MS } from "@/lib/constants";
import { useRateGate } from "@/components/shared/RateGateProvider";
import { useAtom } from "jotai";
import { useSetAtom } from "jotai";
import { attentionAtom, rateAtom, type AttentionOffice } from "@/lib/atoms";
import styles from "./AppHeader.module.css";

/** sessionStorage key — cleared on logout so fresh login re-triggers the modal. */
const SESSION_KEY = "highBalanceWarningShown";

type HighBalanceAgent = { id: string; name: string; balance_usd: number };

export function AppHeader() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const setAttention = useSetAtom(attentionAtom);
  const { gateCleared } = useRateGate();
  const [rates, setRates] = useAtom(rateAtom);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // High-balance warning dialog (auto-opens once per browser session)
  const [highBalanceAgents, setHighBalanceAgents] = useState<HighBalanceAgent[]>([]);
  const [warningOpen, setWarningOpen] = useState(false);

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

  // Things that need attention today: agents who owe, agents over the
  // uncollected-balance threshold, and offices overdue a collection.
  // Shared through attentionAtom so the sidebar badges and the dashboard
  // list read one source. Refreshes on mount, on navigation and when the
  // tab regains focus. Only runs AFTER the rate gate is cleared (AC-8).
  useEffect(() => {
    if (!gateCleared) return;

    let cancelled = false;

    async function fetchAttention() {
      const orgId = await getOrganisationId();
      if (cancelled || !orgId) return;

      const [{ data: agentRows }, { data: officeRows }] = await Promise.all([
        supabase
          .from("agents")
          .select("id, name, balance_usd")
          .eq("organisation_id", orgId)
          .eq("status", "active")
          .gt("balance_usd", 0)
          .order("balance_usd", { ascending: false }),
        supabase
          .from("regional_offices")
          .select("id, name, cash_held_gbp, last_collection_date")
          .eq("organisation_id", orgId)
          .order("name", { ascending: true }),
      ]);
      if (cancelled) return;

      const owing: HighBalanceAgent[] = (agentRows ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        balance_usd: Number(a.balance_usd),
      }));
      const breaching = owing.filter(
        (a) => a.balance_usd >= UNCOLLECTED_BALANCE_THRESHOLD
      );

      const overdueOffices: AttentionOffice[] = (officeRows ?? [])
        .map((o: any) => ({
          id: o.id as string,
          name: o.name as string,
          cash_held_gbp: Number(o.cash_held_gbp),
          days: o.last_collection_date
            ? daysSince(o.last_collection_date)
            : null,
        }))
        .filter(
          (o) => getLocationStatus(o.days ?? Number.POSITIVE_INFINITY) === "red"
        );

      setAttention({
        owingCount: owing.length,
        highBalanceAgents: breaching,
        overdueOffices,
        loaded: true,
      });

      // Auto-open the warning dialog once per browser session.
      if (breaching.length > 0 && !sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, "true");
        setHighBalanceAgents(breaching);
        setWarningOpen(true);
      }
    }

    fetchAttention();

    function onVisible() {
      if (document.visibilityState === "visible") fetchAttention();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase, gateCleared, pathname, setAttention]);

  async function onLogout() {
    // Clear session flags so modals fire again on next login.
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("rateGateCleared");
    await supabase.auth.signOut();
    resetToPath("/login");
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

  const setTime = rates.timestamp
    ? new Date(rates.timestamp).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <header className={styles.header}>
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

      <div className={styles.rates} aria-label="Today's rates">
        <span className={styles.ratesTitle}>Today&apos;s rates</span>
        <span className={styles.rate}>
          <span className={styles.rateLabel}>
            Send<span className={styles.ratePair}> GBP→USD</span>
          </span>
          <span className={styles.rateValue}>
            {rates.sendRate?.toFixed(4) ?? "—"}
          </span>
        </span>
        <span className={styles.rate}>
          <span className={styles.rateLabel}>
            Receive<span className={styles.ratePair}> USD→GBP</span>
          </span>
          <span className={styles.rateValue}>
            {rates.receiveRate?.toFixed(4) ?? "—"}
          </span>
        </span>
        {setTime && <span className={styles.rateSet}>Set {setTime}</span>}
      </div>

      <div className={styles.user}>
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
