"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createEstimate } from "@/lib/estimates/actions";
import { Msg, primaryBtn } from "@/components/admin/ui";

export default function NewEstimateButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await createEstimate();
            if (r.ok) router.push(`/samata/${r.id}`);
            else setMsg({ ok: false, text: r.error });
          })
        }
        className={`${primaryBtn} flex w-full items-center justify-center gap-2`}
      >
        <Plus size={20} aria-hidden /> {pending ? "Kuriama..." : "Nauja sąmata"}
      </button>
      <Msg msg={msg} />
    </div>
  );
}
