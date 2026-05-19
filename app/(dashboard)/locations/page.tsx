import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";

export default function LocationsPage() {
  return (
    <>
      <PageHeader
        title="Regional offices"
        description="Cash held across regional offices."
        actions={<Button>New office</Button>}
      />
    </>
  );
}
