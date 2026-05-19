import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";

export default function DepositsPage() {
  return (
    <>
      <PageHeader
        title="Individual deposits"
        description="Track held customer deposits."
        actions={<Button>New deposit</Button>}
      />
    </>
  );
}
