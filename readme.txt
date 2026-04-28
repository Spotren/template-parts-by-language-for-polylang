=== Template Parts by Language for Polylang ===
Contributors: openai
Tags: polylang, block editor, site editor, template parts, multilingual
Requires at least: 6.5
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.1.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adds per-language template part overrides to the Template Part block when Polylang is active.

== Description ==

Template Parts by Language for Polylang extends the `core/template-part` block with per-language overrides driven by Polylang.

The plugin lets you:

* Assign a different template part slug for each Polylang language.
* Keep the base template part as the default fallback.
* Edit overrides directly in template editing contexts.
* See a contextual notice in page editing that links to the template where the overrides must be configured.

Overrides apply on frontend render. If Polylang is unavailable, no language mapping exists, or the mapped template part does not exist, WordPress falls back to the original template part.

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/template-parts-by-language-for-polylang` directory, or install the plugin through the WordPress plugins screen.
2. Activate the plugin through the `Plugins` screen in WordPress.
3. Make sure Polylang is installed and active.
4. Open the Site Editor and edit a template containing a Template Part block.
5. Configure the `Language Overrides` panel for the selected Template Part block.

== Frequently Asked Questions ==

= Where do I edit the language overrides? =

Edit them in the Site Editor while editing the template itself. When you select a Template Part block inside page editing, the sidebar shows a notice linking to the template that should be edited.

= What happens if Polylang is disabled? =

The overrides are ignored and the original template part continues to render.

= Does the editor preview switch template parts by language? =

Not in this version. Overrides apply on frontend render, while the editor preview keeps the base template part.

== Changelog ==

= 0.1.2 =

* Added community health files for contribution guidelines, security reporting, support guidance, issue templates, and pull request intake.

= 0.1.1 =

* Restricted `Language Overrides` controls to template editing contexts.
* Added a contextual sidebar notice in page editing with a link to the template where overrides must be edited.
* Resolved template links for pages using the default theme template hierarchy, including front page and default page templates.

= 0.1.0 =

* Initial release.
