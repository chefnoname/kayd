import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware normally handles this first; kept as a fallback.
  redirect("/home");
}
