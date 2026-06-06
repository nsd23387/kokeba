// Assemble the full image prompt for one scene from the book's scenes.json.
// Keeps the look locked + country-agnostic: shared_block (style + identity + setting)
// is prepended to every scene's specific prompt.

export function composePrompt(manifest, scene) {
  const shared = (manifest.shared_block || "").trim();
  const specific = (scene.prompt || "").trim();
  return `${shared}\n\n${specific}`.trim();
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
