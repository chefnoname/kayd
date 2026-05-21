"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLongDate, toDateString } from "@/lib/utils";
import { startOnboardingTour } from "@/lib/tour";
import styles from "./AppHeader.module.css";

export function AppHeader() {
  const router = useRouter();
  const supabase = createClient();

  const [rate, setRate] = useState<number | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user?.email) setEmail(user.email);

      const today = toDateString();
      const { data } = await supabase
        .from("daily_rates")
        .select("gbp_to_usd")
        .eq("date", today)
        .maybeSingle();

      if (!cancelled && data) setRate(Number(data.gbp_to_usd));
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function onLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = email
    ? email
        .split("@")[0]
        .split(/[.\-_]/)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2)
    : "U";

  return (
    <header className={styles.header}>
      <div className={styles.brand}>Kayd</div>

      <div className={styles.meta}>
        <span className={styles.date}>{formatLongDate()}</span>
        <Badge className={styles.rateBadge} data-tour="daily-rate-badge">
          {rate ? `GBP→USD ${rate.toFixed(4)}` : "Rate not set"}
        </Badge>
      </div>

      <div className={styles.user}>
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startOnboardingTour()}
          className={styles.logout}
        >
          Replay tour
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onLogout}
          className={styles.logout}
        >
          Log out
        </Button>
      </div>
    </header>
  );
}
