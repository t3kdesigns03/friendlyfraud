import type { Metadata } from "next";
import { getGalaxyData } from "@/lib/galaxy/data";
import { GalaxyExperience } from "@/components/galaxy/GalaxyExperience";

export const metadata: Metadata = {
  title: "YERRRP",
  description: "Outer space, WoW: Forever style. Ride a gryphon between the guild's worlds.",
};

export default async function ExplorePage() {
  const data = await getGalaxyData();
  return (
    <main>
      <h1 className="sr-only">YERRRP — the Friendly Fraud galaxy</h1>
      <GalaxyExperience data={data} />
    </main>
  );
}
