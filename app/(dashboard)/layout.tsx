import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { AccessDeniedToast } from "@/components/shared/AccessDeniedToast";
import { EmailVerificationToast } from "@/components/shared/EmailVerificationToast";
import { Suspense } from "react";
import styles from "./layout.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <AccessDeniedToast />
        <EmailVerificationToast />
      </Suspense>
      <div className={styles.shell}>
        <AppHeader />
        <div className={styles.body}>
          <Sidebar />
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
