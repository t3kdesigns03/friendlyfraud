import { redirect } from "next/navigation";
import { GUILD_NAME } from "@/config/guild";
import { isWriter, passcodeConfigured } from "@/lib/auth";
import { loginAction } from "@/lib/actions/misc";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "Unlock" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : "/";
  if (await isWriter()) redirect(nextPath);
  return (
    <div className="mx-auto max-w-sm pt-6 sm:pt-16">
      <div className="eyebrow mb-2">Guild access</div>
      <h1 className="display text-3xl text-ink">Enter the passcode</h1>
      <p className="mt-2 text-sm text-ink-dim">
        Everything on {GUILD_NAME}&apos;s site is public to read. The shared passcode unlocks signups, roster edits,
        and attendance.
      </p>
      <ActionForm action={loginAction} className="card mt-6 flex flex-col gap-4 p-5">
        <input type="hidden" name="next" value={nextPath} />
        <div className="field">
          <label className="label" htmlFor="passcode">
            Passcode
          </label>
          <input
            id="passcode"
            name="passcode"
            type="password"
            autoComplete="current-password"
            className="input"
            required
            autoFocus
          />
        </div>
        <Submit pendingText="Checking…">Unlock</Submit>
        {!passcodeConfigured() && (
          <p className="hint">Server note: set GUILD_PASSCODE in the environment to enable editing.</p>
        )}
      </ActionForm>
    </div>
  );
}
