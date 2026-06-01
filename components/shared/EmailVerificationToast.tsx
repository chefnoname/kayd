"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function EmailVerificationToast() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const verify = params.get("verify_email");

  useEffect(() => {
    if (!verify) return;

    toast({
      title: "Verify your email",
      description: "Check your inbox to confirm your account.",
    });

    const url = new URL(window.location.href);
    url.searchParams.delete("verify_email");
    router.replace(url.pathname + url.search);
  }, [verify, router, toast]);

  return null;
}
