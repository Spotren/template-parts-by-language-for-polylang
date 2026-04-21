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

## Distribution Notes

- Include the compiled `build/` directory in any ZIP release.
- Do not include `node_modules/` in the distributable package.
- If `build/index.js` is missing, the plugin will show an admin notice and skip loading the editor UI.
- The generated `template-parts-by-language-for-polylang.zip` is a release artifact and should not be committed.
- A GitHub Actions workflow is included at `.github/workflows/release.yml` to build and attach the ZIP on GitHub releases.

## Release Checklist

1. Run `npm run build`.
2. Run `php bin/smoke-test.php /absolute/path/to/wordpress`.
3. Confirm the Site Editor sidebar loads and lists the expected template parts.
4. Generate the distributable archive with `npm run plugin-zip`.

## Runtime Behavior

- Base block: `core/template-part`
- Custom attribute: `tplbypolylangOverrides`
- Format: `{ "pt": "hero-br", "en": "hero-en" }`
- Fallback: if Polylang is unavailable, the language has no mapping, or the mapped template part does not exist, the original template part is rendered.
