import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";

export default function SettlementPage() {
  return (
    <>
      <PageHeader
        title="Settlement"
        description="Record cash received from agents."
        actions={<Button>Record settlement</Button>}
      />
    </>
  );
}
