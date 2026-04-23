import { getSession } from "@/lib/auth";
import DashboardNav from "@/components/DashboardNav";
import DashboardFilters from "@/components/DashboardFilters";
import { Suspense } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <DashboardNav userEmail={session?.email} />
      <Suspense fallback={null}>
        <DashboardFilters />
      </Suspense>
      <main
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "24px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
