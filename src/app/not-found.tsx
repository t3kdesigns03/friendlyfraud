import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md pt-16 text-center">
      <div className="eyebrow mb-3">404</div>
      <h1 className="display text-4xl text-ink">Lost in the Barrow Deeps</h1>
      <p className="mt-3 text-sm text-ink-dim">That page, character or event doesn&apos;t exist.</p>
      <Link href="/" className="btn mt-6">
        Back to the guild hall
      </Link>
    </div>
  );
}
