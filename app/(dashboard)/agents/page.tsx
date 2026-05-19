"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AgentSearchBar,
  type AgentFilter,
} from "@/components/agents/AgentSearchBar";
import { AgentTable } from "@/components/agents/AgentTable";
import { AddAgentModal } from "@/components/agents/AddAgentModal";
import { EditAgentModal } from "@/components/agents/EditAgentModal";
import type { Agent } from "@/components/agents/types";
import { formatCurrency, toDateString } from "@/lib/utils";
import styles from "./agents.module.css";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRate, setTodayRate] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AgentFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);

  const today = toDateString();

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [{ data: agentRows }, { data: rateRow }] = await Promise.all([
      supabase
        .from("agents")
        .select(
          "id, name, city, phone, balance_usd, last_settlement, status"
        )
        .order("name", { ascending: true }),
      supabase
        .from("daily_rates")
        .select("gbp_to_usd")
        .eq("date", today)
        .maybeSingle(),
    ]);

    setAgents(
      (agentRows ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        phone: r.phone,
        balance_usd: Number(r.balance_usd),
        last_settlement: r.last_settlement,
        status: r.status,
      }))
    );
    setTodayRate(rateRow ? Number(rateRow.gbp_to_usd) : null);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((a) => {
      if (q && !a.name.toLowerCase().includes(q) && !a.city.toLowerCase().includes(q)) {
        return false;
      }
      switch (filter) {
        case "in_debt":
          return a.status === "active" && a.balance_usd > 0;
        case "settled_today":
          return a.last_settlement === today;
        case "inactive":
          return a.status === "inactive";
        case "all":
        default:
          return true;
      }
    });
  }, [agents, query, filter, today]);

  const totalOutstanding = useMemo(
    () =>
      agents
        .filter((a) => a.status === "active")
        .reduce((sum, a) => sum + a.balance_usd, 0),
    [agents]
  );

  const settledTodayCount = useMemo(
    () => agents.filter((a) => a.last_settlement === today).length,
    [agents, today]
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Agents"
        description="View, manage and settle balances across your agent network."
        actions={
          <div className={styles.headerMeta}>
            <span className={styles.metaPill}>
              <span>Total agents</span>
              <span className={styles.metaValue}>{agents.length}</span>
            </span>
            <span className={styles.metaPill}>
              <span>Outstanding</span>
              <span className={styles.metaValue}>
                {formatCurrency(totalOutstanding, "USD")}
              </span>
            </span>
            <Button onClick={() => setAddOpen(true)}>Add Agent</Button>
          </div>
        }
      />

      <div className={styles.summaryGrid}>
        <Card>
          <CardHeader>
            <CardTitle className={styles.summaryLabel}>
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.summaryValue}>
              {formatCurrency(totalOutstanding, "USD")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className={styles.summaryLabel}>
              Agents Settled Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.summaryValue}>{settledTodayCount}</div>
          </CardContent>
        </Card>
      </div>

      <AgentSearchBar
        query={query}
        filter={filter}
        onQueryChange={setQuery}
        onFilterChange={setFilter}
      />

      {loading ? (
        <Card>
          <CardContent style={{ padding: "1.25rem" }}>
            Loading agents…
          </CardContent>
        </Card>
      ) : (
        <AgentTable
          agents={filtered}
          todayRate={todayRate}
          expandedId={expandedId}
          onToggleExpand={(id) =>
            setExpandedId((curr) => (curr === id ? null : id))
          }
          onEditAgent={(a) => setEditAgent(a)}
          onAddAgent={() => setAddOpen(true)}
        />
      )}

      <AddAgentModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={load}
      />
      <EditAgentModal
        agent={editAgent}
        open={!!editAgent}
        onOpenChange={(o) => {
          if (!o) setEditAgent(null);
        }}
        onSaved={load}
      />
    </div>
  );
}
