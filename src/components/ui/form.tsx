"use client";
import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps, Alert } from "@/components/ui";
import type { ActionResult } from "@/lib/actions";
import { Loader2 } from "lucide-react";

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

const FieldErrorsContext = React.createContext<Record<string, string>>({});
export const useFieldError = (name: string) => React.useContext(FieldErrorsContext)[name];

/** Form bound to a server action with inline error/success messages. */
export function ActionForm({ action, children, className, resetOnSuccess, onSuccess }: {
  action: Action; children: React.ReactNode; className?: string; resetOnSuccess?: boolean; onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
    }
  }, [state, resetOnSuccess, onSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} noValidate={false}>
      <FieldErrorsContext.Provider value={state?.fieldErrors ?? {}}>
        {state?.error && <Alert tone="error" className="mb-3">{state.error}</Alert>}
        {state?.ok && state.message && <Alert tone="success" className="mb-3">{state.message}</Alert>}
        {children}
      </FieldErrorsContext.Provider>
    </form>
  );
}

export function FieldError({ name }: { name: string }) {
  const err = useFieldError(name);
  return err ? <p className="text-xs text-red-600" role="alert">{err}</p> : null;
}

/** Small inline form for one-click actions (toggle, delete) with optional confirm. */
export function InlineAction({ action, children, confirm, hidden, className }: {
  action: (fd: FormData) => Promise<void>; children: React.ReactNode; confirm?: string; hidden?: Record<string, string>; className?: string;
}) {
  return (
    <form action={action} className={className} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
    </form>
  );
}
