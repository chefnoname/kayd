"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  daysSince,
  formatCurrency,
  getLocationStatus,
} from "@/lib/utils";
import type { RegionalOffice } from "./types";
import styles from "./LocationGrid.module.css";

interface LocationGridProps {
  offices: RegionalOffice[];
  onLogCollection: (office: RegionalOffice) => void;
  onViewHistory: (office: RegionalOffice) => void;
}

export function LocationGrid({
  offices,
  onLogCollection,
  onViewHistory,
}: LocationGridProps) {
  if (offices.length === 0) {
    return (
      <div className={styles.empty}>
        No offices yet. Click <strong>Add office</strong> to create one.
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {offices.map((o) => (
        <LocationCard
          key={o.id}
          office={o}
          onLogCollection={onLogCollection}
          onViewHistory={onViewHistory}
        />
      ))}
    </div>
  );
}

function LocationCard({
  office,
  onLogCollection,
  onViewHistory,
}: {
  office: RegionalOffice;
  onLogCollection: (office: RegionalOffice) => void;
  onViewHistory: (office: RegionalOffice) => void;
}) {
  const days = office.last_collection_date
    ? daysSince(office.last_collection_date)
    : null;
  const status = getLocationStatus(days ?? Number.POSITIVE_INFINITY);

  const borderClass =
    status === "green"
      ? styles.borderGreen
      : status === "amber"
        ? styles.borderAmber
        : styles.borderRed;

  return (
    <Card className={`${styles.card} ${borderClass}`}>
      <CardHeader>
        <CardTitle className={styles.name}>{office.name}</CardTitle>
      </CardHeader>
      <CardContent className={styles.content}>
        <div className={styles.amountRow}>
          <span className={styles.amountLabel}>Cash held</span>
          <span className={styles.amount}>
            {formatCurrency(office.cash_held_gbp, "GBP")}
          </span>
        </div>

        <div className={styles.daysRow}>
          {days === null ? (
            <span className={styles.daysNever}>No collections yet</span>
          ) : (
            <span className={styles.days}>
              {days === 0
                ? "Collected today"
                : `${days} day${days === 1 ? "" : "s"} since last collection`}
            </span>
          )}
          {status === "red" && (
            <span className={styles.overdue}>Collection overdue</span>
          )}
        </div>

        <div className={styles.actions}>
          <Button
            size="sm"
            onClick={() => onLogCollection(office)}
            className={styles.logBtn}
          >
            Log collection
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewHistory(office)}
          >
            View history
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
