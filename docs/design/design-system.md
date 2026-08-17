# Signal CRM design system

## Direction

The interface uses a calm healthcare-adjacent visual language: deep navy navigation, warm neutral workspace surfaces, restrained green actions, generous whitespace, and evidence-first information hierarchy. It is inspired by the approved reference without presenting itself as an official mama health product.

## Foundations

- **Typography:** Segoe UI with system fallbacks; compact UI labels and high-contrast display headings.
- **Color:** navy `#061D35`, ink `#0B1D37`, green `#20BD68`, warm canvas `#FBFAF7`, line `#E5E7E4`.
- **Radius:** 9–10px for controls, 12–15px for cards, 20px for feature surfaces.
- **Elevation:** borders establish structure; soft shadows are reserved for primary feature surfaces.
- **Spacing:** 4px base rhythm, with 12–16px control gaps and 28–55px page spacing.

## Components

- Responsive application shell and mobile navigation drawer.
- Primary navigation item with active, hover, focus, and count states.
- Primary and secondary buttons with keyboard focus states.
- Cards, status pills, icon tiles, text fields, avatar, and icon buttons.
- Reduced-motion support and semantic landmarks.

## Usage

Global tokens and component classes live in `apps/web/src/app/globals.css`. The reusable shell lives in `apps/web/src/components/app-shell.tsx`. Feature screens should use these foundations instead of introducing competing colors, radii, or control patterns.
