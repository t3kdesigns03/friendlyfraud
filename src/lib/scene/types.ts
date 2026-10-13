import type { ClassId, Role } from "@/config/guild";

// Plain, serializable data the server hands the 3D layer. Built in
// src/lib/scene/data.ts, consumed by the scene through the store.

export type SceneRaid = {
  id: string;
  name: string;
  size: number;
  unlockDate: string | null;
  killed: number;
  total: number;
  bosses: { name: string; killed: boolean }[];
  next: { id: string; title: string; when: string; yes: number; maybe: number; cap: number | null } | null;
};

export type SceneCharacter = {
  id: string;
  name: string;
  cls: ClassId;
  className: string;
  color: string;
  role: Role;
  isMain: boolean;
  planned: boolean;
  memberName: string | null;
  path: string;
};

export type SceneData = {
  raids: SceneRaid[];
  characters: SceneCharacter[];
};
