# Layout helpers
## render-fidel.py — bake non-Latin script into PNGs (so it ALWAYS shows/prints)
The fidel (and other scripts) only render where the font is present. To guarantee display in any
document/proof and on KDP print, render the words to images with the embedded font, then place the PNGs.
This is the canonical fix for "the Ethiopian letters aren't showing." See docs/fidel-rendering.md.
Run it in your Codex environment (where you can install the font).
