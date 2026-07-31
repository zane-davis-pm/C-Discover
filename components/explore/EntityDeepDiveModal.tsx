"use client";

// ============================================================
// C-Discover — Entity Deep Dive Modal
// Phase 1.4/1.5 (PROJECT_PLAN_MULTISTATE.md): full-screen overlay
// that reuses DeepDiveDashboard (components/deep-dive/DeepDiveDashboard.tsx)
// directly, loading the real chart-rich dataset via loadDeepDive —
// the same data previously only reachable at /entity/[type]/[id].
// This replaces the old ad hoc peer-benchmark implementation that
// only had access to the plain entity fields.
// ============================================================

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { Copy, X } from "lucide-react";

import { DeepDiveDashboard } from "@/components/deep-dive/DeepDiveDashboard";
import { ShortlistButton } from "@/components/explore/ShortlistButton";
import { CompareCheckbox } from "@/components/explore/CompareCheckbox";
import { deepDiveHref, deepDiveRouteType, loadDeepDive } from "@/lib/deep-dive-data";
import type { AnyDeepDive, AnyEntity } from "@/lib/types";

interface EntityDeepDiveModalProps {
  entity: AnyEntity | null;
  open: boolean;
  onClose: () => void;
}

type Status = "idle" | "loading" | "ready" | "not-found" | "error";

export function EntityDeepDiveModal({
  entity,
  open,
  onClose,
}: EntityDeepDiveModalProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState<AnyDeepDive | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !entity) {
      setStatus("idle");
      setDetail(null);
      return;
    }
    const routeType = deepDiveRouteType(entity.type);
    if (!routeType) {
      setStatus("not-found");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    loadDeepDive(entity.state, routeType, entity.id)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setStatus("not-found");
        } else {
          setDetail(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, entity]);

  function copyShareLink() {
    if (!entity) return;
    const href = deepDiveHref(entity.state, entity.type, entity.id);
    if (!href || typeof window === "undefined") return;
    const url = `${window.location.origin}${href}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-gray-950/55 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[61] flex h-[92vh] w-[min(1180px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md bg-white shadow-2xl"
          aria-label={entity ? `Deep dive: ${entity.name}` : "Deep dive"}
        >
          {entity && (
            <>
              <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
                  Deep dive
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Shortlist + compare live here because the deep dive is
                      now the only detail surface — reached from both the
                      explore tables and the map popups. */}
                  <ShortlistButton entity={entity} className="text-xs" />
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    <CompareCheckbox
                      state={entity.state}
                      type={entity.type}
                      id={entity.id}
                      name={entity.name}
                    />
                    Compare
                  </label>
                  <span
                    aria-hidden="true"
                    className="mx-1 h-5 w-px bg-gray-200"
                  />
                  {deepDiveHref(entity.state, entity.type, entity.id) && (
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? "Link copied" : "Copy shareable link"}
                    </button>
                  )}
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close deep dive"
                      className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white px-5 py-5">
                {status === "loading" && (
                  <p className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-500">
                    Loading deep dive…
                  </p>
                )}

                {status === "not-found" && (
                  <div className="rounded-md border border-gray-200 bg-white p-6">
                    <p className="text-sm font-semibold text-gray-900">
                      No deep dive is available for {entity.name}.
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      A deep-dive detail file has not been generated for this
                      entity yet.
                    </p>
                  </div>
                )}

                {status === "error" && (
                  <div className="rounded-md border border-gray-200 bg-white p-6">
                    <p className="text-sm font-semibold text-gray-900">
                      Deep dive data could not be loaded.
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      Please close and try again.
                    </p>
                  </div>
                )}

                {status === "ready" && detail && (
                  <DeepDiveDashboard dd={detail} />
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
