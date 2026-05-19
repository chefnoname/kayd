"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type { SettlementAgent } from "./types";
import styles from "./AgentSelector.module.css";

interface AgentSelectorProps {
  agents: SettlementAgent[];
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}

export function AgentSelector({
  agents,
  value,
  onChange,
  disabled,
}: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => agents.find((a) => a.id === value) ?? null,
    [agents, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)
    );
  }, [agents, query]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className={styles.field}>
      <Label htmlFor="agent-trigger">Agent</Label>
      <div className={styles.wrap} ref={containerRef}>
        <button
          id="agent-trigger"
          type="button"
          className={styles.trigger}
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={selected ? styles.triggerValue : styles.placeholder}>
            {selected
              ? `${selected.name} — owes ${formatCurrency(selected.balance_usd, "USD")}`
              : "Select an agent…"}
          </span>
          <ChevronDown size={16} className={styles.chev} aria-hidden />
        </button>

        {open && (
          <div className={styles.menu} role="listbox">
            <div className={styles.searchRow}>
              <Search size={14} className={styles.searchIcon} aria-hidden />
              <Input
                autoFocus
                placeholder="Search by name or city…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={styles.search}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className={styles.clear}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <ul className={styles.list}>
              {filtered.length === 0 && (
                <li className={styles.empty}>No matching agents.</li>
              )}
              {filtered.map((a) => {
                const active = a.id === value;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`${styles.option} ${active ? styles.optionActive : ""}`}
                      onClick={() => {
                        onChange(a.id);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span className={styles.optName}>{a.name}</span>
                      <span className={styles.optMeta}>
                        owes {formatCurrency(a.balance_usd, "USD")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
