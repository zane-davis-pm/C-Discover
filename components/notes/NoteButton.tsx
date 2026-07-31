"use client";

// ============================================================
// C-Discover — Note Button + Editor
// Entity notes feature: a small icon button (filled when a note
// exists) that opens a dialog with a free-text editor. Saves on
// dialog close and on explicit Save; empty text deletes the note.
// Reused in explore RowActionsCell (compact) and ShortlistTable
// (compact + preview). Notes are device-local (lib/notes.ts).
// ============================================================

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { StickyNote, X } from "lucide-react";
import { useNotes, noteKey } from "@/lib/notes";
import { cn } from "@/lib/utils";

interface NoteButtonProps {
  id: string;
  state: string;
  /** Entity name, used for the dialog title and aria-labels. */
  name: string;
  /**
   * compact=true: icon only, table-row sized (default).
   * compact=false: icon + "Note" label.
   */
  compact?: boolean;
  /** Show a truncated inline preview of the note text next to the icon. */
  showPreview?: boolean;
  className?: string;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NoteButton({
  id,
  state,
  name,
  compact = true,
  showPreview = false,
  className,
}: NoteButtonProps) {
  const note = useNotes((s) => s.notes[noteKey(id, state)]);
  const setNote = useNotes((s) => s.setNote);

  const hasNote = !!note && note.text.trim().length > 0;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const save = (text: string) => {
    setNote(id, state, text);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(note?.text ?? "");
    } else {
      // Autosave on close (also covers Esc / overlay click).
      save(draft);
    }
    setOpen(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={
            hasNote ? `Edit note for ${name}` : `Add note for ${name}`
          }
          title={hasNote ? "Edit note" : "Add note"}
          className={cn(
            "inline-flex items-center gap-1 font-medium rounded",
            compact ? "text-xs" : "text-sm",
            hasNote
              ? "text-amber-600 hover:text-amber-800"
              : "text-gray-400 hover:text-gray-600",
            className,
          )}
        >
          <StickyNote
            className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
            fill={hasNote ? "currentColor" : "none"}
            fillOpacity={hasNote ? 0.25 : 0}
          />
          {!compact && "Note"}
          {showPreview && hasNote && (
            <span className="text-xs text-gray-500 font-normal truncate max-w-[140px]">
              {note!.text}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          onClick={(e) => e.stopPropagation()}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md rounded-lg bg-white p-5 shadow-xl focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <Dialog.Title className="text-sm font-semibold text-gray-900">
                Note — {name}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-gray-500 mt-0.5">
                Saved on this device only.
                {hasNote && note?.updated_at
                  ? ` Last edited ${formatTimestamp(note.updated_at)}.`
                  : ""}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close note editor"
                className="text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note about this entity…"
            rows={6}
            autoFocus
            aria-label={`Note text for ${name}`}
            className="w-full rounded-md border border-gray-300 p-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-y"
          />

          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={() => {
                setDraft("");
                save("");
                setOpen(false);
              }}
              disabled={!hasNote && draft.trim().length === 0}
              className={cn(
                "text-xs font-medium rounded",
                !hasNote && draft.trim().length === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-red-500 hover:text-red-700",
              )}
            >
              Delete note
            </button>
            <button
              type="button"
              onClick={() => {
                save(draft);
                setOpen(false);
              }}
              className="text-sm font-medium text-white bg-brand-800 hover:bg-brand-900 px-3 py-1.5 rounded-md"
            >
              Save
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
