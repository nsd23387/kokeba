# Intake Agent — New-Title flow (how the form is generated and used)
1. **Select packs:** creator picks a Country Pack + Age-Range Pack.
2. **Resolve the character (NEW):**
   - If the Country Pack already has a character (e.g. Ethiopia -> Eden, Kenya -> Zuri), present it to confirm.
   - If it's a NEW country with no character, run the **Character Designer** (agents/character-designer)
     to create an ORIGINAL character for that market (name meaningful in the pack's vocab_language, authentic
     diverse look, optional local companion). The creator confirms/edits. Never reuse another country's cast.
   - The confirmed character is written to the pack's characters/ and carried into the draft.
3. **Generate the form:** an agent emits a personalized intake (pre-filled from the packs + the resolved character).
4. **Creator fills it:** the required human input (theme, cast, culture, learning focus, framework, refrain, tone).
5. **Compose the Author prompt:** Country Prompt + Age Prompt + Framework + House Style + Filled Intake
   (including the confirmed character). See agents/author/compose-story-prompt.md.
6. **Draft -> gates:** Author drafts; native reviewer (Gate 1) + compliance pre-flight follow.

Modular & country-agnostic: the form and the character step auto-adapt to ANY Country/Age pack with no code changes.
