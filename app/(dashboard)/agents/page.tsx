"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getOrganisationId } from "@/lib/org";
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
import { AgentDetailModal } from "@/components/agents/AgentDetailModal";
import { CollectionCompanyList } from "@/components/agents/CollectionCompanyList";
import type { Agent } from "@/components/agents/types";
import { formatCurrency, toDateString } from "@/lib/utils";
import styles from "./agents.module.css";

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRate, setTodayRate] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AgentFilter>("all");
  const [sortField, setSortField] = useState<"created_at" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [addOpen, setAddOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const today = toDateString();

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const orgId = await getOrganisationId();
    if (!orgId) {
      setAgents([]);
      setLoading(false);
      return;
    }

    const [{ data: agentRows }, { data: rateRow }] = await Promise.all([
      supabase
        .from("agents")
        .select(
          "id, name, city, phone, balance_usd, last_agent_deposit, status, collection_company_id, created_at, collection_companies(name)"
        )
        .eq("organisation_id", orgId)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("daily_rates")
        .select("gbp_to_usd")
        .eq("organisation_id", orgId)
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
        last_agent_deposit: r.last_agent_deposit,
        status: r.status,
        collection_company_id: r.collection_company_id,
        collection_company_name: r.collection_companies?.name ?? null,
        created_at: r.created_at,
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
          return a.last_agent_deposit === today;
        case "inactive":
          return a.status === "inactive";
        case "all":
        default:
          return true;
      }
    });
  }, [agents, query, filter, today]);

  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const aVal = new Date(a[sortField]).getTime();
      const bVal = new Date(b[sortField]).getTime();
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return copy;
  }, [filtered, sortField, sortDir]);

  const totalOutstanding = useMemo(
    () =>
      agents
        .filter((a) => a.status === "active")
        .reduce((sum, a) => sum + a.balance_usd, 0),
    [agents]
  );

  const settledTodayCount = useMemo(
    () => agents.filter((a) => a.last_agent_deposit === today).length,
    [agents, today]
  );

  async function handleDeleteAgent(agentId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("agents")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", agentId);

    if (error) {
      alert(`Failed to delete agent: ${error.message}`);
      return;
    }
    setDetailOpen(false);
    setSelectedAgent(null);
    load();
  }

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
          agents={sorted}
          todayRate={todayRate}
          onRowClick={(agent) => {
            setSelectedAgent(agent);
            setDetailOpen(true);
          }}
          sortField={sortField}
          sortDir={sortDir}
          onSortChange={(field) => {
            if (sortField === field) {
              setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            } else {
              setSortField(field as "created_at");
              setSortDir("desc");
            }
          }}
          onEditAgent={(a) => setEditAgent(a)}
          onAddAgent={() => setAddOpen(true)}
          onDeleteAgent={handleDeleteAgent}
        />
      )}

      <CollectionCompanyList />

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
      <AgentDetailModal
        agent={selectedAgent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSettle={() => {
          if (selectedAgent) {
            router.push(`/agent-deposits?agentId=${selectedAgent.id}`);
          }
        }}
        onEdit={() => {
          if (selectedAgent) {
            setDetailOpen(false);
            setEditAgent(selectedAgent);
          }
        }}
        onDelete={() => {
          if (selectedAgent) handleDeleteAgent(selectedAgent.id);
        }}
      />
    </div>
  );
}
