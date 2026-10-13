import { redirect } from "next/navigation";
import { isWriter } from "@/lib/auth";
import { listMembers } from "@/lib/data/roster";
import { createCharacterAction } from "@/lib/actions/roster";
import { CharacterForm, EMPTY_CHARACTER } from "@/components/character-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Add character" };

export default async function NewCharacterPage() {
  if (!(await isWriter())) redirect("/login?next=/roster/new");
  const members = await listMembers();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Roster" title="Add a character" sub="Planned launch characters welcome — flip them to Active on Nov 4." />
      <CharacterForm
        action={createCharacterAction}
        initial={EMPTY_CHARACTER}
        members={members.map((m) => m.name)}
        submitLabel="Add to roster"
      />
    </div>
  );
}
