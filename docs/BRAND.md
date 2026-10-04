# Sentinel Sniff brand integration

Source: the user-supplied `Sentinel Sniff Brand kit.zip`, applied on 4 October 2026. Its brand guide and handoff specify a plume-to-leaf mark, Fraunces wordmark, Inter UI, warm borders and 18px cards. The homepage keeps its detailed landscape illustrations and botanical framing.

## Assets and usage

- `web/src/assets/brand/mark-color.svg`: supplied colour mark, used in the shared navigation and homepage footer.
- `web/src/assets/brand/mark-reverse.svg`: supplied reverse mark, used on the evergreen homepage call to action.
- `web/public/brand/favicon.svg`: supplied evergreen tile for the browser tab.

The SVGs are copied unchanged, including their embedded provenance metadata. `web/src/components/Brand.tsx` pairs them with a live Fraunces wordmark: Sentinel at weight 500 and Sniff in tangerine italic at weight 400. This uses the same loaded font as the app and keeps the name available to assistive technology. Navigation marks stay at least 24px; the favicon uses the supplied tile.

## Styling and scope

The kit's palette matches the existing brief. Shared borders use `#e7e1d4`, outlined hero buttons use `#d9d2c3`, and cards use the supplied two-part soft shadow. Homepage display headings use Fraunces 400, with smaller headings at 500. Small labels and hero emphasis retain the darker methane-ramp shade for readability; the wordmark uses the supplied tangerine.

The visible product name, browser title, description and social metadata use Sentinel Sniff. Repository URLs, routes, calculations and the internal npm package name remain as configured. The original design brief is retained as project history. Brand-board scripts, pitch slides and other reference pages are not imported into the app.
