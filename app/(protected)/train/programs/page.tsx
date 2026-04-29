"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getPrograms, switchProgram, deleteProgram } from "@/lib/actions/programs";
import { Skeleton } from "@/components/Skeleton";
import Link from "next/link";
import type { ProgramV2 } from "@/lib/program";

type Program = {
  id: string;
  name: string;
  program: ProgramV2;
  is_active: boolean;
  updated_at: string;
};

export default function ProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading]   = useState(true);
  const [confirm, setConfirm]   = useState<{ type: "activate" | "delete"; id: string; name: string } | null>(null);
  const [pending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    const { data } = await getPrograms();
    setPrograms(data as Program[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleActivate(prog: Program) {
    const hasActive = programs.some((p) => p.is_active && p.id !== prog.id);
    if (hasActive) {
      setConfirm({ type: "activate", id: prog.id, name: prog.name });
    } else {
      doActivate(prog.id);
    }
  }

  function doActivate(id: string) {
    startTransition(async () => {
      await switchProgram(id);
      setConfirm(null);
      window.location.href = "/train";
    });
  }

  function handleDelete(prog: Program) {
    setConfirm({ type: "delete", id: prog.id, name: prog.name });
  }

  function doDelete(id: string) {
    startTransition(async () => {
      await deleteProgram(id);
      setConfirm(null);
      await load();
    });
  }

  function phaseCount(prog: Program) {
    return prog.program?.phases?.length ?? 0;
  }

  function totalWeeks(prog: Program) {
    return prog.program?.phases?.reduce((s: number, p: any) => s + (p.weeks ?? 0), 0) ?? 0;
  }

  const active   = programs.filter((p) => p.is_active);
  const inactive = programs.filter((p) => !p.is_active);

  return (
    <>
      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6">
          <div className="glass widget-shadow rounded-2xl p-5 w-full max-w-sm space-y-4">
            {confirm.type === "activate" ? (
              <>
                <p className="font-semibold">Switch Program?</p>
                <p className="text-sm text-muted-foreground">
                  Your current program will be paused and "{confirm.name}" will become active. Your progress on both will be saved.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">Delete "{confirm.name}"?</p>
                <p className="text-sm text-muted-foreground">This cannot be undone.</p>
              </>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirm(null)}
                className="flex-1 h-11 rounded-xl glass font-medium text-sm press">
                Cancel
              </button>
              <button type="button" disabled={pending}
                onClick={() => confirm.type === "activate" ? doActivate(confirm.id) : doDelete(confirm.id)}
                className={`flex-1 h-11 rounded-xl font-semibold text-sm press disabled:opacity-60 ${
                  confirm.type === "delete" ? "bg-rose-500 text-white" : "bg-primary text-primary-foreground"
                }`}>
                {pending ? "…" : confirm.type === "activate" ? "Switch" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Programs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{programs.length} {programs.length === 1 ? "program" : "programs"}</p>
          </div>
          <Link href="/train/builder"
            onClick={() => { try { localStorage.removeItem("hc-builder-program-id"); } catch {} }}
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold press">
            + New
          </Link>
        </div>

        {loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}

        {!loading && programs.length === 0 && (
          <div className="glass widget-shadow rounded-2xl px-6 py-14 text-center space-y-3">
            <p className="text-2xl">📋</p>
            <p className="font-semibold">No programs yet</p>
            <p className="text-sm text-muted-foreground">Build a custom program or pick a template.</p>
            <div className="flex gap-2 justify-center pt-1">
              <Link href="/train/builder"
                className="px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold press">
                Custom Builder
              </Link>
              <Link href="/train/setup"
                className="px-4 py-2.5 rounded-full glass text-sm font-semibold press">
                Templates
              </Link>
            </div>
          </div>
        )}

        {/* Active program */}
        {active.map((prog) => (
          <div key={prog.id} className="glass widget-shadow rounded-2xl overflow-hidden ring-2 ring-primary/30">
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Active</span>
                  </div>
                  <p className="font-bold text-base mt-1 truncate">{prog.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {phaseCount(prog)} {phaseCount(prog) === 1 ? "phase" : "phases"} · {totalWeeks(prog)} weeks
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-border flex">
              <Link href={`/train/builder?id=${prog.id}`}
                className="flex-1 py-2.5 text-center text-xs font-semibold text-muted-foreground press border-r border-border">
                Edit
              </Link>
              <button type="button" onClick={() => router.push("/train")}
                className="flex-1 py-2.5 text-center text-xs font-semibold text-primary press">
                Train →
              </button>
            </div>
          </div>
        ))}

        {/* Inactive programs */}
        {inactive.length > 0 && (
          <div className="space-y-2">
            {active.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Other Programs</p>
            )}
            {inactive.map((prog) => (
              <div key={prog.id} className="glass widget-shadow rounded-2xl overflow-hidden">
                <div className="px-4 pt-3 pb-2">
                  <p className="font-bold text-sm truncate">{prog.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {phaseCount(prog)} {phaseCount(prog) === 1 ? "phase" : "phases"} · {totalWeeks(prog)} weeks
                  </p>
                </div>
                <div className="border-t border-border flex">
                  <Link href={`/train/builder?id=${prog.id}`}
                    className="flex-1 py-2.5 text-center text-xs font-semibold text-muted-foreground press border-r border-border">
                    Edit
                  </Link>
                  <button type="button" onClick={() => handleActivate(prog)}
                    disabled={pending}
                    className="flex-1 py-2.5 text-center text-xs font-semibold text-primary press border-r border-border disabled:opacity-50">
                    Activate
                  </button>
                  <button type="button" onClick={() => handleDelete(prog)}
                    className="flex-1 py-2.5 text-center text-xs font-semibold text-rose-500 press">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
