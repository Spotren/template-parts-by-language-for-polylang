# Template Parts by Language for Polylang

WordPress plugin that extends the `core/template-part` block with per-language overrides driven by Polylang.

## Development

Install dependencies:

```bash
npm install
```

Build the editor assets:

```bash
npm run build
```

Run the editor build in watch mode:

```bash
npm run start
```

Create an installable ZIP:

```bash
npm run plugin-zip
```

The ZIP workflow assumes `build/` is already present. Run `npm run build` before packaging a release.

Run the smoke test against a local WordPress install:

```bash
php bin/smoke-test.php /absolute/path/to/wordpress
```

## Architecture

- PHP registers the block attribute and applies the frontend `slug` override during `render_block_data`.
- The editor UI lives in `src/index.js`.
- Compiled Gutenberg assets are generated into `build/` by `@wordpress/scripts`.
- The editor reads template parts from WordPress core data and languages from the plugin REST endpoint.

## Runtime Behavior

- Base block: `core/template-part`
- Custom attribute: `tplbypolylangOverrides`
- Format: `{ "pt": "hero-br", "en": "hero-en" }`
- Fallback: if Polylang is unavailable, the language has no mapping, or the mapped template part does not exist, the original template part is rendered.

## Changelog

### 0.1.1

- Restrict `Language Overrides` controls to template editing contexts.
- Show a contextual sidebar notice in page editing that links to the template where overrides must be edited.
- Resolve template links for pages that use the theme template hierarchy, including default page and front page templates.

### 0.1.0

- Initial release.
