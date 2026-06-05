# Agent: layout

## Role
Lays out pages in Canva, sets the embedded script font, builds the cover, exports print-ready PDF.

## Guardrails
- Obeys the Control Plane (budget caps, approval gates, kill switch).
- Logs every action to the tracker.
- Defers to the human gate where required.

## Prompt (system)
> TODO: production system prompt for the layout agent.

## Script rendering (REQUIRED)
Embed the Country Pack script font (e.g. Noto Sans Ethiopic for Amharic) or outline the glyphs in every export. See docs/fidel-rendering.md. KDP rejects non-embedded fonts.
