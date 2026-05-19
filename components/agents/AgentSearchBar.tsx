"use client";

import { X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import styles from "./AgentSearchBar.module.css";

export type AgentFilter = "all" | "in_debt" | "settled_today" | "inactive";

const FILTERS: { value: AgentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_debt", label: "In Debt" },
  { value: "settled_today", label: "Settled Today" },
  { value: "inactive", label: "Inactive" },
];

export interface AgentSearchBarProps {
  query: string;
  filter: AgentFilter;
  onQueryChange: (q: string) => void;
  onFilterChange: (f: AgentFilter) => void;
}

export function AgentSearchBar({
  query,
  filter,
  onQueryChange,
  onFilterChange,
}: AgentSearchBarProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.searchField}>
        <Search size={16} className={styles.searchIcon} aria-hidden />
        <Input
          type="search"
          placeholder="Search by name or city…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className={styles.input}
          aria-label="Search agents"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onQueryChange("")}
            className={styles.clear}
            aria-label="Clear search"
          >
            <X size={14} />
          </Button>
        )}
      </div>

      <div className={styles.filterField}>
        <Label htmlFor="agent-filter" className={styles.filterLabel}>
          Filter
        </Label>
        <select
          id="agent-filter"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as AgentFilter)}
          className={styles.select}
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
