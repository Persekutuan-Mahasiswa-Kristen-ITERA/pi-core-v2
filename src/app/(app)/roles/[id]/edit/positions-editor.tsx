"use client";

import { useActionState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ConfirmAction } from "@/components/common/confirm-action";
import { FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
import { initialActionState } from "@/lib/action-result";
import { addPosition, deletePosition, renamePosition } from "../../actions";

type Position = { id: string; name: string; usage: number };

export function PositionsEditor({ roleId, positions }: { roleId: string; positions: Position[] }) {
  return (
    <div className="space-y-3">
      {positions.length === 0 ? <p className="text-sm text-pmk-body">No positions yet.</p> : null}
      <ul className="space-y-2">
        {positions.map((p) => (
          <li key={p.id}>
            <PositionRow position={p} />
          </li>
        ))}
      </ul>
      <AddPositionForm roleId={roleId} />
    </div>
  );
}

function PositionRow({ position }: { position: Position }) {
  const [state, formAction] = useActionState(renamePosition.bind(null, position.id), initialActionState);
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Saved.");
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);
  return (
    <form action={formAction} className="flex items-center gap-2 rounded-xl bg-pmk-tint p-2">
      <label htmlFor={`position-${position.id}`} className="sr-only">
        Position name
      </label>
      <input
        id={`position-${position.id}`}
        name="name"
        defaultValue={position.name}
        className={`${fieldClass} bg-white`}
        maxLength={80}
      />
      <span className="shrink-0 text-xs text-pmk-body" title="Assignments using this position">
        {position.usage} used
      </span>
      <SubmitButton className="h-11 px-4 shadow-none" pendingText="…">
        Save
      </SubmitButton>
      <ConfirmAction
        action={deletePosition.bind(null, position.id)}
        title={`Delete position “${position.name}”?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        blockedReason={
          position.usage > 0
            ? `${position.usage} assignment(s) use this position. Remove or change them first.`
            : undefined
        }
      >
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-full text-pmk-brown hover:bg-white"
          aria-label={`Delete position ${position.name}`}
        >
          <Trash2 className="size-5" aria-hidden />
        </button>
      </ConfirmAction>
    </form>
  );
}

function AddPositionForm({ roleId }: { roleId: string }) {
  const [state, formAction] = useActionState(addPosition.bind(null, roleId), initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Added.");
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);
  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <FormMessage state={state} />
      <div className="flex items-center gap-2">
        <label htmlFor="new-position" className="sr-only">
          New position name
        </label>
        <input
          id="new-position"
          name="name"
          placeholder="New position, e.g. Ketua Umum"
          className={fieldClass}
          maxLength={80}
          required
        />
        <SubmitButton className="shrink-0 px-5 shadow-none" pendingText="Adding…">
          Add
        </SubmitButton>
      </div>
    </form>
  );
}
