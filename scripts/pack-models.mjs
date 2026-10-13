// Packs the downloaded mount models into lean .glb files for the web.
//   node scripts/pack-models.mjs assets/gryphon/scene.gltf assets/knight/Knight.glb public/models
// Needs glTF-Transform, which isn't a project dependency. Install it somewhere
// throwaway: npm i --no-save @gltf-transform/core@4 @gltf-transform/functions@4
import { NodeIO } from "@gltf-transform/core";
import { dedup, prune } from "@gltf-transform/functions";
import path from "node:path";

const [gryphonIn, knightIn, outDir] = process.argv.slice(2);
const io = new NodeIO();

/** remove animations (and their keyframe data) except `keep` */
function dropAnimations(doc, keep = new Set()) {
  const root = doc.getRoot();
  const kept = new Set(
    root
      .listAnimations()
      .filter((a) => keep.has(a.getName()))
      .flatMap((a) => a.listSamplers().flatMap((s) => [s.getInput(), s.getOutput()])),
  );
  for (const a of root.listAnimations()) {
    if (keep.has(a.getName())) continue;
    for (const s of a.listSamplers()) {
      for (const acc of [s.getInput(), s.getOutput()]) if (acc && !kept.has(acc)) acc.dispose();
      s.dispose();
    }
    for (const c of a.listChannels()) c.dispose();
    a.dispose();
  }
}

async function finish(doc, file) {
  await doc.transform(dedup(), prune());
  await io.write(path.join(outDir, file), doc);
}

// gryphon: the baked clip isn't used (GryphonModel drives the rig), nor are the lamps/camera
const g = await io.read(gryphonIn);
for (const node of g.getRoot().listNodes()) if (/^(Lamp|Camera)/.test(node.getName())) node.dispose();
for (const c of g.getRoot().listCameras()) c.dispose();
dropAnimations(g);
await finish(g, "gryphon.glb");

// knight: only the seated idle
const k = await io.read(knightIn);
dropAnimations(k, new Set(["Sit_Chair_Idle"]));
await finish(k, "knight.glb");
