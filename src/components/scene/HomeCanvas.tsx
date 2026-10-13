"use client";

import SceneCanvas from "./SceneCanvas";
import { StageRig } from "./StageRig";

/** Homepage sky: the shared scene, framed into the hero stage by StageRig. */
export default function HomeCanvas({
  onOpenCharacter,
  onReady,
  small,
}: {
  onOpenCharacter: (path: string) => void;
  onReady: () => void;
  small: boolean;
}) {
  return (
    <SceneCanvas pageEvents onOpenCharacter={onOpenCharacter} onReady={onReady}>
      <StageRig frozen={false} small={small} />
    </SceneCanvas>
  );
}
