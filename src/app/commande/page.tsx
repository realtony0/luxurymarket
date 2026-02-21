import { Suspense } from "react";
import CommandeForm from "@/components/CommandeForm";

function FormFallback() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 animate-[fade-in_0.3s_ease-out]">
      <div className="h-9 w-48 rounded bg-[var(--muted)]/20" />
      <div className="mt-2 h-4 w-64 rounded bg-[var(--muted)]/10" />
      <div className="mt-8 space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-[var(--muted)]/10" />
        ))}
        <div className="h-12 rounded-lg bg-[var(--muted)]/20" />
      </div>
    </div>
  );
}

export default function CommandePage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <CommandeForm />
    </Suspense>
  );
}
