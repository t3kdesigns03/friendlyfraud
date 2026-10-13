import { notFound, redirect } from "next/navigation";
import { isWriter } from "@/lib/auth";
import { getCharacter, listMembers } from "@/lib/data/roster";
import { updateCharacterAction } from "@/lib/actions/roster";
import { characterPath, displayName, parseIdentityParams } from "@/lib/identity";
import { CharacterForm } from "@/components/character-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Edit character" };

export default async function EditCharacterPage({ params }: PageProps<"/characters/[region]/[ruleset]/[name]/edit">) {
  const identity = parseIdentityParams(await params);
  if (!identity) notFound();
  if (!(await isWriter())) redirect(`/login?next=${encodeURIComponent(characterPath(identity) + "/edit")}`);
  const [c, members] = await Promise.all([getCharacter(identity), listMembers()]);
  if (!c) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Roster" title={`Edit ${displayName(c)}`} />
      <CharacterForm
        action={updateCharacterAction}
        members={members.map((m) => m.name)}
        submitLabel="Save changes"
        initial={{
          id: c.id,
          firstName: c.firstName,
          secondName: c.secondName,
          region: c.region,
          ruleset: c.ruleset,
          class: c.class,
          race: c.race,
          role: c.role,
          isMain: c.isMain,
          status: c.status,
          level: c.level,
          memberName: c.memberName ?? "",
          notes: c.notes ?? "",
        }}
      />
    </div>
  );
}
