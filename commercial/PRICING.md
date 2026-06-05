# Kokeba — Packaging & Pricing (template)
| Tier | Includes | Notes |
|---|---|---|
| Engine License | apps/api, apps/worker, packages/*, agents/*, compliance/ | Bring your own packs |
| Studio (UI) add-on | apps/web, packages/ui | Full operator front-end |
| Country Pack | one packs/country-packs/<market> | Per-market SKU |
| Age-Range Pack | one packs/age-range-packs/<band> | Per-band SKU |
| Marketing add-on | agents/marketing/* | Growth/ads agents |
| White-label | commercial/white-label + ui theming | Rebrand & resell |

Entitlements gated by KOKEBA_LICENSE_KEY + ENABLED_TIERS in apps/api.
