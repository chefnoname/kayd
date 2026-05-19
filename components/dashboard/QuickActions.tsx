"use client";

import { useRouter } from "next/navigation";
import { Banknote, CalendarCheck, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import styles from "./QuickActions.module.css";

export function QuickActions() {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className={styles.title}>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className={styles.actions}>
        <Button
          className={styles.action}
          onClick={() => router.push("/settlement")}
        >
          <Banknote size={16} />
          <span>Record Settlement</span>
        </Button>
        <Button
          variant="outline"
          className={styles.action}
          onClick={() => router.push("/agents")}
        >
          <Users size={16} />
          <span>View Agents</span>
        </Button>
        <Button
          variant="outline"
          className={styles.action}
          onClick={() => router.push("/end-of-day")}
        >
          <CalendarCheck size={16} />
          <span>Close Day</span>
        </Button>
      </CardContent>
    </Card>
  );
}
