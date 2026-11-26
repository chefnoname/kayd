import { redirect } from "next/navigation";
import { getConsoleStaff } from "@/lib/console/server";
import { ConsoleNav } from "@/components/console/ConsoleNav";
import { AuthBoundary } from "@/components/shared/AuthBoundary";
import { ToastProvider } from "@/components/ui/toast";
import styles from "../console.module.css";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const staff = await getConsoleStaff();
  if (!staff) redirect("/console/login?denied=1");

  return (
    <AuthBoundary loginPath="/console/login" homePath="/console">
      <ToastProvider>
        <div className={styles.shell}>
          <ConsoleNav staffName={staff.name} />
          <main className={styles.main}>{children}</main>
        </div>
      </ToastProvider>
    </AuthBoundary>
  );
}
