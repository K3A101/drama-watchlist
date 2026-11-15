# CLAUDE.md

This file guides Claude Code when working in this repository.

> **Template:** copy this file into the root of a new project and replace every `{{PLACEHOLDER}}`.
> Delete sections that don't apply.

## Project overview

- **Name:** drama-watchlist
- **Purpose:** Personal watchlist to track dramas (watching, completed, dropped, plan to watch) with star ratings, posters and notes.
- **Type:** Static front-end site (HTML + SCSS + vanilla JS)
- **Language of content:** English <!-- e.g. Dutch / English -->

## Folder structure

```
drama-watchlist/
├── templates/
│   └── index.html          # Page markup (single page app)
├── static/
│   ├── scss/               # Source styles — edit these
│   │   ├── style.scss      # Entry point: only @use partials, no rules
│   │   ├── _variables.scss # CSS custom properties (colors, etc.) on :root
│   │   ├── _fonts.scss     # @font-face / font imports
│   │   ├── _text.scss      # Typography (headings, paragraphs, links)
│   │   ├── _structure.scss # Layout (grid, sections, containers)
│   │   ├── _nav.scss       # Navigation
│   │   ├── _forms.scss     # Inputs, buttons, form elements, star rating
│   │   ├── _cards.scss     # Drama cards grid items
│   │   ├── _modal.scss     # Add/edit dialog
│   │   └── helpers/
│   │       └── _mixins.scss # Reusable mixins (breakpoints, etc.)
│   ├── css/                # Compiled output — DO NOT edit by hand
│   │   ├── style.css
│   │   └── style.css.map
│   ├── js/                 # Scripts
│   │   └── main.js         # Storage, rendering, form logic
│   ├── images/             # Raster images (jpg, png, webp)
│   └── svg/                # Icons and vector graphics
├── package.json
└── CLAUDE.md
```

## Build / compile

- SCSS is compiled with Dart Sass: `static/scss/style.scss` → `static/css/style.css`
- Command: `npm run build` (once) or `npm run watch` (on save)
  <!-- e.g. sass --watch static/scss/style.scss:static/css/style.css -->
- The IDE file watcher ({{IDE}}) may compile automatically on save.
- Never edit files in `static/css/` directly; change the SCSS and recompile.

## SCSS conventions

- Use the module system (`@use`), not `@import`.
- Every partial is prefixed with `_` and registered in `style.scss`.
- Partials that need mixins start with `@use 'helpers/mixins' as *;`.
- Colors and theme values live as CSS custom properties in `_variables.scss`:
  ```scss
  :root {
    --primary: #b5446e;
    --secondary: #2d1e2f;
    --tertiary: #e9a62b;
    --text: #2d1e2f;
    --link: #b5446e;
    --background: #fbf7f4;
  }
  ```
  Always use `var(--name)` instead of hard-coded colors.
- Put new styles in the partial that matches their concern; create a new partial only for a genuinely new area (e.g. `_cards.scss`) and add it to `style.scss`.
- Class naming: BEM (.block__element--modifier) <!-- e.g. BEM: .block__element--modifier -->
- Mobile-first; breakpoints via mixins in `helpers/_mixins.scss`: `@include bp(sm|md|lg)` → 600px / 900px / 1200px

## HTML conventions

- Semantic HTML5 (`header`, `nav`, `main`, `section`, `footer`).
- Set `<html lang="en">` and a meaningful `<title>`.
- Link the compiled stylesheet: `<link rel="stylesheet" href="../static/css/style.css">`
- Images need descriptive `alt` text; decorative images use `alt=""`.
- Accessibility target: {{ACCESSIBILITY_LEVEL}} <!-- e.g. WCAG 2.2 AA -->

## JavaScript

- Vanilla JS in `static/js/`, loaded with `<script src="..." defer>`.
- All logic is in `static/js/main.js`. Data is stored in the browser with IndexedDB (database `drama-watchlist`, store `dramas`); uploaded posters are resized to max 800px and saved as JPEG data URLs. Export/Import buttons back up to JSON.

## Fonts & assets

- Fonts: system font stack (`--font-body`) (declared in `_fonts.scss`)
- Icons go in `static/svg/`, images in `static/images/`.
- Optimize images before adding them.

## Design reference

- Design file / mockup: {{DESIGN_LINK}}
- Brand notes: {{BRAND_NOTES}}

## Working agreements for Claude

- Keep changes small and match the existing structure above.
- Don't add frameworks or dependencies without asking.
- After changing SCSS, remind me to recompile (or run the build command).
- Ignore `node_modules/`, `.idea/`, and `.DS_Store`.
- {{EXTRA_RULES}}
