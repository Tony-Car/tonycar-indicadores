import { getSession } from "@/lib/auth";
import DashboardNav from "@/components/DashboardNav";
import DashboardFilters from "@/components/DashboardFilters";
import { Suspense } from "react";

function DashboardPageFallback() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "24px",
        color: "#94a3b8",
        fontSize: "14px",
      }}
    >
      Carregando painel...
    </div>
  );
}

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
        <Suspense fallback={<DashboardPageFallback />}>{children}</Suspense>
      </main>
    </div>
  );
}
