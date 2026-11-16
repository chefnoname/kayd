import styles from "./PageHeader.module.css";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className={styles.wrap}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {description && <div className={styles.desc}>{description}</div>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
