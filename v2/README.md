# Portfolio v2: Dark Aurora Glass

A ground-up redesign of the portfolio. The original site at the repo root is
untouched; this version lives entirely in this folder.

## Design

- **Theme**: dark aurora glass. A deep indigo scene with slowly drifting
  violet, teal, and rose light fields behind frosted glass panels.
- **Type**: Sora (display and body) with Source Serif 4 italic for warm
  accents.
- **Color**: OKLCH tokens in `style.css`, neutrals tinted toward indigo,
  teal/violet/gold accents.
- **Motion**: preloader with counter and curtain lift, staggered hero
  choreography, scroll reveals, magnetic buttons, 3D photo tilt with glare,
  spotlight hover on project panels, a timeline that draws itself as you
  scroll, a skills marquee, a certificate carousel, and a gallery lightbox.
- **Accessibility**: `prefers-reduced-motion` disables all animation, full
  keyboard navigation, visible focus states, aria labels, descriptive alt text.

## Files

| File | Purpose |
|---|---|
| `index.html` | All markup, no build step |
| `style.css` | Design system and layout, no framework |
| `script.js` | All animation and interaction, no libraries |

Fonts (Sora, Source Serif 4) and icons (Font Awesome) load from CDNs.
Images and the CV are referenced from the repo's existing `../images/` and
`../pdf/` folders.

## Preview

Serve the repo root and open `/v2/`:

```bash
npx serve .
# then visit http://localhost:3000/v2/
```

Opening `v2/index.html` directly in a browser also works.

## If this replaces the current site

Merge the `new-update` branch, then either:

1. Move `v2/index.html`, `v2/style.css`, and `v2/script.js` to the repo root
   (replacing the old files) and update asset paths from `../images/` to
   `images/` and `../pdf/` to `pdf/`, or
2. Keep the folder structure and set the host to serve `/v2/` as the root.
