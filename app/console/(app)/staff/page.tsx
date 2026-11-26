import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { getConsoleStaff } from "@/lib/console/server";
import { formatDate, formatDateTime } from "@/lib/console/format";
import { InviteStaffForm, RemoveStaffButton } from "@/components/console/StaffAdmin";
import styles from "../../console.module.css";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const me = await getConsoleStaff();
  if (!me) redirect("/console/login?denied=1");

  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("kayd_staff")
    .select("id, name, email, created_at, removed_at")
    .order("removed_at", { ascending: true, nullsFirst: true })
    .order("name");

  const ids = (staff ?? []).map((s) => s.id);
  const lastSignIn: Record<string, string | null> = {};
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      lastSignIn[id] = data.user?.last_sign_in_at ?? null;
    })
  );

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Kayd staff</h1>
          <p className={styles.lede}>People at Kayd who can open this console. Client accounts can never get in here.</p>
        </div>
      </header>

      <div className={styles.grid2}>
        <section className={styles.card} aria-labelledby="team-h">
          <div className={styles.cardHead}>
            <h2 id="team-h" className={styles.cardTitle}>Team</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Last sign-in</th>
                  <th scope="col"><span className={styles.muted}>Access</span></th>
                </tr>
              </thead>
              <tbody>
                {(staff ?? []).map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.name} {s.id === me.id && <span className={styles.pillInfo}>You</span>}
                      <div className={styles.sub}>{s.email}</div>
                    </td>
                    <td>{formatDateTime(lastSignIn[s.id])}</td>
                    <td>
                      {s.removed_at ? (
                        <span className={styles.muted}>Removed {formatDate(s.removed_at)}</span>
                      ) : s.id === me.id ? (
                        <span className={styles.muted}>Since {formatDate(s.created_at)}</span>
                      ) : (
                        <RemoveStaffButton userId={s.id} name={s.name} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="invite-h">
          <div className={styles.cardHead}>
            <h2 id="invite-h" className={styles.cardTitle}>Add someone</h2>
          </div>
          <div className={styles.cardBody}>
            <InviteStaffForm />
          </div>
        </section>
      </div>
    </>
  );
}
