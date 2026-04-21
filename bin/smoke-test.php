<?php
/**
 * Minimal smoke test for Template Parts by Language for Polylang.
 *
 * Usage:
 * php wp-content/plugins/template-parts-by-language-for-polylang/bin/smoke-test.php /absolute/path/to/wordpress
 *
 * @package TemplatePartsByLanguageForPolylang
 */

if ( PHP_SAPI !== 'cli' ) {
	fwrite( STDERR, "This script must be run from the CLI.\n" );
	exit( 1 );
}

$wordpress_path = $argv[1] ?? getcwd();
$wp_load_path   = rtrim( (string) $wordpress_path, '/\\' ) . '/wp-load.php';

if ( ! file_exists( $wp_load_path ) ) {
	fwrite( STDERR, "Could not find wp-load.php at: {$wp_load_path}\n" );
	exit( 1 );
}

require_once $wp_load_path;

if ( function_exists( 'wp_set_current_user' ) ) {
	wp_set_current_user( 1 );
}

$failures = array();

if ( ! is_plugin_active( 'template-parts-by-language-for-polylang/template-parts-by-language-for-polylang.php' ) ) {
	$failures[] = 'Plugin is not active.';
}

if ( ! function_exists( 'pll_current_language' ) ) {
	$failures[] = 'Polylang is not active.';
}

$registry = WP_Block_Type_Registry::get_instance();
$block    = $registry->get_registered( 'core/template-part' );

if ( ! $block ) {
	$failures[] = 'core/template-part is not registered.';
} elseif ( ! isset( $block->attributes['tplbypolylangOverrides'] ) ) {
	$failures[] = 'tplbypolylangOverrides attribute is missing from core/template-part.';
}

$request  = new WP_REST_Request( 'GET', '/template-parts-by-language-for-polylang/v1/languages' );
$response = rest_do_request( $request );

if ( 200 !== $response->get_status() ) {
	$failures[] = 'Languages endpoint did not return HTTP 200.';
}

$theme      = get_stylesheet();
$templates  = function_exists( 'get_block_templates' ) ? get_block_templates( array(), 'wp_template_part' ) : array();
$slugs      = wp_list_pluck( $templates, 'slug' );
$base_slug  = $slugs[0] ?? '';
$next_slug  = $slugs[1] ?? '';
$lang       = function_exists( 'pll_current_language' ) ? pll_current_language( 'slug' ) : '';

if ( $base_slug && $next_slug && $lang ) {
	$content  = sprintf(
		'<!-- wp:template-part {"slug":"%1$s","theme":"%2$s","tplbypolylangOverrides":{"%3$s":"%4$s"}} /-->',
		esc_attr( $base_slug ),
		esc_attr( $theme ),
		esc_attr( $lang ),
		esc_attr( $next_slug )
	);
	$blocks   = parse_blocks( $content );
	$filtered = apply_filters( 'render_block_data', $blocks[0], $blocks[0], null );

	if ( empty( $filtered['attrs']['slug'] ) || $next_slug !== $filtered['attrs']['slug'] ) {
		$failures[] = 'render_block_data did not swap the template part slug for the current language.';
	}
} else {
	$failures[] = 'Could not run slug override smoke test because there are not enough template parts or languages.';
}

if ( ! empty( $failures ) ) {
	fwrite( STDERR, "Smoke test failed:\n" );
	foreach ( $failures as $failure ) {
		fwrite( STDERR, "- {$failure}\n" );
	}
	exit( 1 );
}

fwrite( STDOUT, "Smoke test passed.\n" );
exit( 0 );
