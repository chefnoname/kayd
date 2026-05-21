"use client";

import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { createClient } from "@/lib/supabase";

const TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="balance-summary"]',
    popover: {
      title: "Your daily overview",
      description:
        "Every morning starts here. These three cards show your system limit, cash in safe, and total agent debt at a glance.",
    },
  },
  {
    element: '[data-tour="daily-rate-badge"]',
    popover: {
      title: "Set your daily rate",
      description:
        "Before recording any settlements, set today's GBP to USD exchange rate. Everything converts from this.",
    },
  },
  {
    element: '[data-tour="nav-agents"]',
    popover: {
      title: "Your agent roster",
      description:
        "All your agents and their outstanding balances live here. Add agents, check what they owe, and settle directly from this screen.",
    },
  },
  {
    element: '[data-tour="nav-settlement"]',
    popover: {
      title: "Record a settlement",
      description:
        "When an agent delivers cash, record it here. The system converts at today's rate and updates their balance automatically.",
    },
  },
  {
    element: '[data-tour="nav-end-of-day"]',
    popover: {
      title: "Close the day",
      description:
        "At the end of each day, enter your physical cash count. The system reconciles everything and flags any discrepancies.",
    },
  },
  {
    element: '[data-tour="quick-actions"]',
    popover: {
      title: "You're ready",
      description:
        "Use these shortcuts to move fast. Start by setting today's rate, then add your agents.",
      doneBtnText: "Get started",
    },
  },
];

async function markTourComplete(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("staff_users")
      .update({ has_seen_tour: true })
      .eq("id", user.id);
  } catch {
    // Silent — failing to persist shouldn't break the UX.
  }
}

/**
 * Starts the onboarding tour. Persists `has_seen_tour = true` on completion
 * or skip so it never plays again automatically.
 */
export function startOnboardingTour(): void {
  if (typeof window === "undefined") return;

  const tour = driver({
    showProgress: true,
    allowClose: false,
    overlayClickBehavior: "nextStep",
    smoothScroll: true,
    popoverClass: "kayd-tour-popover",
    onDestroyStarted: () => {
      void markTourComplete();
      tour.destroy();
    },
    steps: TOUR_STEPS,
  });

  tour.drive();
}
