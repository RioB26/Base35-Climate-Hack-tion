# Sentinel Sniff brand integration

Source: the user-supplied `Sentinel Sniff Brand kit.zip`, applied on 4 October 2026. Its brand guide and handoff specify a plume-to-leaf mark, Fraunces wordmark, Inter UI, warm borders and 18px cards. The homepage keeps its detailed landscape illustrations and botanical framing.

## Assets and usage

- `web/src/assets/brand/mark-color.svg`: supplied colour mark, used in the shared navigation and homepage footer.
- `web/src/assets/brand/mark-reverse.svg`: supplied reverse mark, used on the evergreen homepage call to action.
- `web/public/favicon.svg`: evergreen tile for the browser tab, brought in with main's brand assets. The earlier copy at `web/public/brand/favicon.svg` is also retained.

The supplied SVGs are copied unchanged, including their embedded provenance metadata. `web/src/components/Mark.tsx` uses them for loading states and `web/src/components/Brand.tsx` pairs that mark with a live Fraunces wordmark: Sentinel at weight 500 and Sniff in tangerine italic at weight 400. This uses the same loaded font as the app and keeps the name available to assistive technology. Navigation marks stay at least 24px; the favicon uses the supplied tile.

## Styling and scope

The kit's palette matches the existing brief. Shared borders use `#e7e1d4`, outlined hero buttons use `#d9d2c3`, and cards use the supplied two-part soft shadow. Homepage display headings use Fraunces 400, with smaller headings at 500. Small labels and hero emphasis retain the darker methane-ramp shade for readability; the wordmark uses the supplied tangerine.

The visible product name, browser title, description and social metadata use Sentinel Sniff. Repository URLs, routes, calculations and the internal npm package name remain as configured. The original design brief is retained as project history. Brand-board scripts, pitch slides and other reference pages are not imported into the app.

## Across the workflow

Find, Check, Fix and Fund share the homepage's content width, navigation lockup, heading hierarchy, warm outlined pill buttons, rounded cards and spacing. Methane chart areas use tangerine; electricity uses the sky tint. `SiteFooter.tsx` and `site-footer.css` provide project navigation and research links on every page. Its How it works link returns to the homepage section from any step.

Home and Find use the same workflow copy from `web/src/data/journey.ts`. The homepage coverage counts come from the live data provider. Interactive map and 3D loading states use the same mark; when rendering is unavailable, branded fallback panels keep the search, screening and project estimates usable.

Workflow screens use compact 20–22px card padding, 16px vertical gaps and left-aligned body copy. Check places the baseline and satellite readings together, followed by a separate verdict, before the map and detailed evidence. Source and proxy badges sit apart from paragraphs. Supporting methods, evidence requirements and observation records can be expanded without crowding the main result. The map's evidence choices use labelled buttons with a visible selected state. Fix's 3D preview starts collapsed on tablet and mobile so the controls are reached sooner; it stays open on desktop. Mobile Fund summaries use two columns.
