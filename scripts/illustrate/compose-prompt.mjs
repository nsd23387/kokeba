// Assemble the full image prompt for one scene from the book's scenes.json.
// Keeps the look locked + country-agnostic: shared_block (style + identity + setting)
// is prepended to every scene's specific prompt.

export function composePrompt(manifest, scene) {
  const shared = (manifest.shared_block || "").trim();
  const specific = (scene.prompt || "").trim();
  let out = `${shared}\n\n${specific}`.trim();
  // Persisted reviewer feedback travels with the scene as permanent art direction.
  if (Array.isArray(scene.feedback) && scene.feedback.length) {
    out += `\n\nPERSISTENT ART DIRECTION (reviewer feedback — ALWAYS apply, do not regress):\n- ${scene.feedback.join("\n- ")}`;
  }
  return out;
}

// Resolve a scene's ref keys (e.g. ["eden","mama"]) to absolute file paths,
// using manifest.refs as the key->relativePath map.
export function resolveRefs(manifest, scene, bookDir, path) {
  const keys = scene.refs && scene.refs.length ? scene.refs : Object.keys(manifest.refs || {});
  return keys.map((k) => {
    const rel = manifest.refs?.[k];
    if (!rel) throw new Error(`Scene "${scene.id}" references unknown ref key "${k}"`);
    return path.resolve(bookDir, rel);
  });
}
