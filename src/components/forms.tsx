"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/actions/util";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const Pending = createContext(false);

/**
 * Form wrapper for server actions: pending state, inline errors, optional
 * confirm prompt. Once hydrated, submits via onSubmit + startTransition so
 * React doesn't auto-reset fields when the server returns a validation error.
 */
export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
  confirm,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      // Before hydration this makes a native submit POST to the server action
      // (progressive enhancement) instead of a GET that leaks fields into the URL.
      action={dispatch}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (confirm && !window.confirm(confirm)) return;
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        startTransition(() => dispatch(fd));
      }}
    >
      <Pending.Provider value={pending}>{children}</Pending.Provider>
      {state.error && (
        <p role="alert" className="mt-3 rounded-lg border border-no/40 bg-no/10 px-3 py-2 text-sm text-no">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className="mt-3 rounded-lg border border-yes/30 bg-yes/10 px-3 py-2 text-sm text-yes">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function Submit({
  children,
  className = "btn btn-gold",
  pendingText,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
}) {
  const pending = useContext(Pending);
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}
