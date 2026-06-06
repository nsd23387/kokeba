// OpenAI gpt-image provider for Kokeba illustration.
// Calls the Images EDIT endpoint with the locked character reference sheet(s)
// attached, so every scene keeps the same character + wardrobe.
//
// Swap this file (same exported shape) to use Recraft / Firefly / Replicate instead.
//
// Exports: { name, generate({ prompt, refPaths, size }) -> Buffer (PNG bytes) }

import fs from "node:fs";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const MODEL = process.env.IMAGE_GEN_MODEL || "gpt-image-1";
const QUALITY = process.env.IMAGE_GEN_QUALITY || "high"; // low | medium | high | auto
const API_KEY = process.env.IMAGE_GEN_API_KEY || process.env.OPENAI_API_KEY;

export const name = `openai:${MODEL}`;

export function ready() {
  return Boolean(API_KEY);
}

export async function generate({ prompt, refPaths = [], size = "1024x1024" }) {
  if (!API_KEY) {
    throw new Error(
      "IMAGE_GEN_API_KEY (or OPENAI_API_KEY) is not set. Add it to .env before generating."
    );
  }
  const client = new OpenAI({ apiKey: API_KEY });

  // Attach the reference images so the model copies identity + wardrobe.
  const images = [];
  for (const p of refPaths) {
    if (!fs.existsSync(p)) {
      throw new Error(`Reference image not found: ${p}`);
    }
    images.push(await toFile(fs.createReadStream(p), null, { type: "image/png" }));
  }

  const params = { model: MODEL, prompt, size };
  if (QUALITY && QUALITY !== "auto") params.quality = QUALITY;

  let res;
  if (images.length > 0) {
    res = await client.images.edit({ ...params, image: images });
  } else {
    // No refs (rare) — fall back to plain generation.
    res = await client.images.generate(params);
  }

  const b64 = res?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image API returned no image data.");
  return Buffer.from(b64, "base64");
}
