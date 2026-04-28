# Contributing

Thanks for contributing to Template Parts by Language for Polylang.

## Before you start

- Open an issue before starting larger changes so the approach can be aligned first.
- Keep pull requests focused on one change.
- Do not commit generated release artifacts such as the plugin ZIP.

## Local development

Install dependencies:

```bash
npm install
```

Build editor assets:

```bash
npm run build
```

Run the build in watch mode:

```bash
npm run start
```

Run the smoke test against a local WordPress install:

```bash
php bin/smoke-test.php /absolute/path/to/wordpress
```

## Coding expectations

- Follow WordPress coding conventions in PHP.
- Keep changes compatible with the current plugin architecture and WordPress block editor patterns already used in the project.
- Update `README.md` and `readme.txt` when behavior changes in a way users or contributors should know.
- Rebuild assets after changing files in `src/`.

## Pull requests

Please include:

- A short summary of the change
- Why the change is needed
- Manual test steps
- Screenshots when editor UI changes

If your change affects multilingual behavior, describe the tested language setup and the expected fallback behavior.
