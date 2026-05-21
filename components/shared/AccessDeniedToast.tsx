"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

/**
 * Surfaces middleware-driven access denials as a toast and clears the
 * `denied` query param from the URL.
 */
export function AccessDeniedToast() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const denied = params.get("denied");

  useEffect(() => {
    if (!denied) return;

    if (denied === "team") {
      toast({
        title: "Access denied",
        description: "You don't have permission to view that page",
      });
    }

    // Strip the param so the toast doesn't re-fire on refresh
    const url = new URL(window.location.href);
    url.searchParams.delete("denied");
    router.replace(url.pathname + url.search);
  }, [denied, router, toast]);

  return null;
}
