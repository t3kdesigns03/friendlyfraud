import type { Metadata } from "next";
import { getSceneData } from "@/lib/scene/data";
import { ExploreExperience } from "@/components/explore/ExploreExperience";

export const metadata: Metadata = {
  title: "YERRRP",
  description: "Fly a raven between the launch raids and the guild crest.",
};

export default async function ExplorePage() {
  const data = await getSceneData();
  return (
    <main>
      <h1 className="sr-only">YERRRP — fly the Friendly Fraud sky</h1>
      <ExploreExperience data={data} />
    </main>
  );
}
