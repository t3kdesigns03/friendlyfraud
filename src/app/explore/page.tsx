import type { Metadata } from "next";
import { getSceneData } from "@/lib/scene/data";
import { ExploreExperience } from "@/components/explore/ExploreExperience";

export const metadata: Metadata = {
  title: "Explore",
  description: "Fly a raven between the launch raids and the guild crest.",
};

export default async function ExplorePage() {
  const data = await getSceneData();
  return (
    <main>
      <h1 className="sr-only">Explore the Friendly Fraud sky</h1>
      <ExploreExperience data={data} />
    </main>
  );
}
