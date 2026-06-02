import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Construction } from "lucide-react";


function Stub({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div className="glass-card rounded-2xl p-16 text-center">
        <div className="size-14 mx-auto rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center shadow-[var(--shadow-glow)]">
          <Construction className="size-6 text-primary-foreground" />
        </div>
        <p className="mt-4 font-semibold">Module coming soon</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          This area is part of the enterprise build. Hook it to your API and ship.
        </p>
      </div>
    </div>
  );
}

export { Stub };

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — Ishan Technologies" }] }),
  component: () => <Stub title="Customers & Leads" />,
});
