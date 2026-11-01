import { notFound } from "next/navigation";

// Integrations (PI-NEXUS etc.) are out of scope for the MVP; the drawer shows it as "Soon".
export default function IntegrationsPage() {
  notFound();
}
