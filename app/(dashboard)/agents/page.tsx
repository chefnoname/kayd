import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AgentsPage() {
  return (
    <>
      <PageHeader
        title="Agents"
        description="Manage agents and view balances."
        actions={<Button>New agent</Button>}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Balance (USD)</TableHead>
            <TableHead>Last settlement</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No agents yet. <Badge variant="secondary">Add one to begin</Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
}
