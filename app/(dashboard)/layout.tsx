import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/toast";
import styles from "./layout.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
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
