import { PageHeader } from "@/components/shared/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Today's cash position at a glance."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cash in safe</CardTitle>
          </CardHeader>
          <CardContent>£ —</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total agent debt</CardTitle>
          </CardHeader>
          <CardContent>£ —</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Collections today</CardTitle>
          </CardHeader>
          <CardContent>£ —</CardContent>
        </Card>
      </div>
    </>
  );
}
