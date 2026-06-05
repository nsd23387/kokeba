# Non-Latin script rendering (fidel / Ge'ez, Arabic, etc.) — Layout & Export requirement
The vocabulary word on each right page is in the Country Pack's script. For Ethiopia that's the Ge'ez
fidel. Rendering it reliably is a LAYOUT/EXPORT concern, not a content concern.

## Rules (the Layout + Assembly/Export agents MUST follow)
1. Embed the script font in every exported file. For Amharic use **Noto Sans Ethiopic** (SIL OFL, free) or
   **Abyssinica SIL**. Embed it in the PDF, or **outline the glyphs** so they print regardless of the reader's fonts.
2. Never rely on the reader having the font. A loose .docx that names a font the recipient lacks shows blanks
   (this is what happened in the first text-only review doc).
3. KDP print: the interior/cover PDF must have all fonts embedded or outlined, or it fails KDP's check.

## Why review happens AFTER layout (collective review)
Because the fidel only renders correctly in the laid-out, font-embedded proof, the native-speaker review
(Gate 1) is done on that assembled proof — text + illustrations + fidel together — not on a separate text file.

## For previews on a Mac
macOS ships the **Kefa** Ethiopic font, so Word/Pages can display fidel if the run is set to Kefa (or if
Noto Sans Ethiopic is installed). This is only for previews — production still embeds/outlines the font.
