import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";

export default function EndOfDayPage() {
  return (
    <>
      <PageHeader
        title="End of day"
        description="Close out the day's balance and review discrepancies."
        actions={<Button>Close day</Button>}
      />
    </>
  );
}
