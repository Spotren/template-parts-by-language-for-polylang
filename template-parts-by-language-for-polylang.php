<?php
/**
 * Plugin Name:       Template Parts by Language for Polylang
 * Plugin URI:        https://github.com/Spotren/template-parts-by-language-for-polylang
 * Description:       Adds per-language template part overrides to the Template Part block when Polylang is active.
 * Version:           0.1.2
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Spotren
 * Author URI:        https://spotren.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       template-parts-by-language-for-polylang
 *
 * @package TemplatePartsByLanguageForPolylang
 */

defined( 'ABSPATH' ) || exit;

define( 'TPLBYPOLYLANG_VERSION', '0.1.2' );
define( 'TPLBYPOLYLANG_PLUGIN_FILE', __FILE__ );
define( 'TPLBYPOLYLANG_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'TPLBYPOLYLANG_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'TPLBYPOLYLANG_ATTRIBUTE', 'tplbypolylangOverrides' );
define( 'TPLBYPOLYLANG_BUILD_PATH', TPLBYPOLYLANG_PLUGIN_DIR . 'build/index.js' );
define( 'TPLBYPOLYLANG_BUILD_ASSET_PATH', TPLBYPOLYLANG_PLUGIN_DIR . 'build/index.asset.php' );

/**
 * Loads plugin translations.
 *
 * @return void
 */
function tplbypolylang_load_textdomain() {
	load_plugin_textdomain(
		'template-parts-by-language-for-polylang',
		false,
		dirname( plugin_basename( TPLBYPOLYLANG_PLUGIN_FILE ) ) . '/languages'
	);
}
add_action( 'init', 'tplbypolylang_load_textdomain' );

/**
 * Adds the custom override attribute to the core/template-part block on the server.
 *
 * @param array  $args       Block type args.
 * @param string $block_name Block name.
 * @return array
 */
function tplbypolylang_register_block_attribute( $args, $block_name ) {
	if ( 'core/template-part' !== $block_name ) {
		return $args;
	}

	if ( ! isset( $args['attributes'] ) || ! is_array( $args['attributes'] ) ) {
		$args['attributes'] = array();
	}

	$args['attributes'][ TPLBYPOLYLANG_ATTRIBUTE ] = array(
		'type'    => 'object',
		'default' => array(),
	);

	return $args;
}
add_filter( 'register_block_type_args', 'tplbypolylang_register_block_attribute', 10, 2 );

/**
 * Registers the editor extension script.
 *
 * @return void
 */
function tplbypolylang_register_editor_assets() {
	if ( ! file_exists( TPLBYPOLYLANG_BUILD_PATH ) ) {
		return;
	}

	$script_asset = file_exists( TPLBYPOLYLANG_BUILD_ASSET_PATH )
		? require TPLBYPOLYLANG_BUILD_ASSET_PATH
		: array(
			'dependencies' => array(
				'wp-api-fetch',
				'wp-block-editor',
				'wp-blocks',
				'wp-components',
				'wp-compose',
				'wp-core-data',
				'wp-data',
				'wp-element',
				'wp-hooks',
				'wp-i18n',
			),
			'version'      => TPLBYPOLYLANG_VERSION,
		);

	wp_register_script(
		'tplbypolylang-editor',
		TPLBYPOLYLANG_PLUGIN_URL . 'build/index.js',
		$script_asset['dependencies'],
		(string) filemtime( TPLBYPOLYLANG_BUILD_PATH ),
		true
	);

	$config = array(
		'languagesPath' => '/' . tplbypolylang_get_rest_namespace() . '/languages',
		'attribute'     => TPLBYPOLYLANG_ATTRIBUTE,
		'activeTheme'   => get_stylesheet(),
		'siteEditorUrl' => admin_url( 'site-editor.php' ),
		'showOnFront'   => (string) get_option( 'show_on_front', 'posts' ),
		'pageOnFront'   => (int) get_option( 'page_on_front', 0 ),
		'pageForPosts'  => (int) get_option( 'page_for_posts', 0 ),
	);

	wp_add_inline_script(
		'tplbypolylang-editor',
		'window.tplByPolylangConfig = ' . wp_json_encode( $config ) . ';',
		'before'
	);

	wp_set_script_translations(
		'tplbypolylang-editor',
		'template-parts-by-language-for-polylang',
		TPLBYPOLYLANG_PLUGIN_DIR . 'languages'
	);
}
add_action( 'init', 'tplbypolylang_register_editor_assets' );

/**
 * Enqueues the editor script for block editors, including the Site Editor.
 *
 * @return void
 */
function tplbypolylang_enqueue_block_editor_assets() {
	if ( ! wp_script_is( 'tplbypolylang-editor', 'registered' ) ) {
		return;
	}

	wp_enqueue_script( 'tplbypolylang-editor' );
}
add_action( 'enqueue_block_editor_assets', 'tplbypolylang_enqueue_block_editor_assets' );

/**
 * Displays an admin notice when the distributable build is missing.
 *
 * @return void
 */
function tplbypolylang_missing_build_notice() {
	if ( file_exists( TPLBYPOLYLANG_BUILD_PATH ) ) {
		return;
	}

	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}

	echo '<div class="notice notice-error"><p>';
	echo esc_html__(
		'Template Parts by Language for Polylang is missing its compiled Gutenberg assets. Rebuild the plugin before distributing or activating it from source.',
		'template-parts-by-language-for-polylang'
	);
	echo '</p></div>';
}
add_action( 'admin_notices', 'tplbypolylang_missing_build_notice' );

/**
 * Returns the plugin REST namespace.
 *
 * @return string
 */
function tplbypolylang_get_rest_namespace() {
	return 'template-parts-by-language-for-polylang/v1';
}

/**
 * Registers the REST endpoint used by the editor sidebar.
 *
 * @return void
 */
function tplbypolylang_register_rest_routes() {
	register_rest_route(
		tplbypolylang_get_rest_namespace(),
		'/languages',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'tplbypolylang_get_languages_response',
			'permission_callback' => 'tplbypolylang_can_access_editor_context',
		)
	);
}
add_action( 'rest_api_init', 'tplbypolylang_register_rest_routes' );

/**
 * Checks whether the current user can edit template parts in the Site Editor.
 *
 * @return bool
 */
function tplbypolylang_can_access_editor_context() {
	$post_type = get_post_type_object( 'wp_template_part' );

	if ( ! $post_type || empty( $post_type->cap ) || empty( $post_type->cap->edit_posts ) ) {
		return current_user_can( 'edit_theme_options' );
	}

	return current_user_can( $post_type->cap->edit_posts );
}

/**
 * Returns normalized language data for the editor.
 *
 * @return array[]
 */
function tplbypolylang_get_languages() {
	if ( ! function_exists( 'pll_languages_list' ) ) {
		return array();
	}

	$languages = pll_languages_list(
		array(
			'fields' => '',
		)
	);

	if ( ! is_array( $languages ) ) {
		return array();
	}

	$items = array();

	foreach ( $languages as $language ) {
		if ( ! is_object( $language ) || empty( $language->slug ) ) {
			continue;
		}

		$items[] = array(
			'slug'   => (string) $language->slug,
			'name'   => ! empty( $language->name ) ? (string) $language->name : (string) $language->slug,
			'locale' => ! empty( $language->locale ) ? (string) $language->locale : '',
		);
	}

	usort(
		$items,
		static function ( $left, $right ) {
			return strcasecmp( $left['name'], $right['name'] );
		}
	);

	return $items;
}

/**
 * Returns the REST response consumed by the editor UI.
 *
 * @return WP_REST_Response
 */
function tplbypolylang_get_languages_response() {
	return rest_ensure_response(
		array(
			'polylangActive' => function_exists( 'pll_current_language' ),
			'languages'      => tplbypolylang_get_languages(),
		)
	);
}

/**
 * Normalizes the override map saved on the block attribute.
 *
 * @param mixed $overrides Raw attribute value.
 * @return array
 */
function tplbypolylang_normalize_overrides( $overrides ) {
	if ( ! is_array( $overrides ) ) {
		return array();
	}

	$normalized = array();

	foreach ( $overrides as $language_slug => $template_part_slug ) {
		$language_slug      = sanitize_key( (string) $language_slug );
		$template_part_slug = sanitize_title( (string) $template_part_slug );

		if ( '' === $language_slug || '' === $template_part_slug ) {
			continue;
		}

		$normalized[ $language_slug ] = $template_part_slug;
	}

	return $normalized;
}

/**
 * Checks whether a template part exists for the active theme.
 *
 * @param string $slug  Template part slug.
 * @param string $theme Theme stylesheet.
 * @return bool
 */
function tplbypolylang_template_part_exists( $slug, $theme ) {
	if ( '' === $slug || '' === $theme || ! function_exists( 'get_block_template' ) ) {
		return false;
	}

	return null !== get_block_template( $theme . '//' . $slug, 'wp_template_part' );
}

/**
 * Replaces the template part slug before the block is rendered.
 *
 * @param array         $parsed_block Parsed block about to be rendered.
 * @param array         $source_block Original parsed block.
 * @param WP_Block|null $parent_block Parent block instance.
 * @return array
 */
function tplbypolylang_filter_template_part_block( $parsed_block, $source_block, $parent_block ) {
	unset( $source_block, $parent_block );

	if (
		! is_array( $parsed_block ) ||
		empty( $parsed_block['blockName'] ) ||
		'core/template-part' !== $parsed_block['blockName'] ||
		empty( $parsed_block['attrs'] ) ||
		! is_array( $parsed_block['attrs'] )
	) {
		return $parsed_block;
	}

	if ( ! function_exists( 'pll_current_language' ) ) {
		return $parsed_block;
	}

	$current_language = pll_current_language( 'slug' );
	if ( empty( $current_language ) || ! is_string( $current_language ) ) {
		return $parsed_block;
	}

	$overrides = tplbypolylang_normalize_overrides(
		$parsed_block['attrs'][ TPLBYPOLYLANG_ATTRIBUTE ] ?? array()
	);

	if ( empty( $overrides[ $current_language ] ) ) {
		return $parsed_block;
	}

	$theme = ! empty( $parsed_block['attrs']['theme'] ) && is_string( $parsed_block['attrs']['theme'] )
		? $parsed_block['attrs']['theme']
		: get_stylesheet();

	$override_slug = $overrides[ $current_language ];

	if ( ! tplbypolylang_template_part_exists( $override_slug, $theme ) ) {
		return $parsed_block;
	}

	$parsed_block['attrs']['slug'] = $override_slug;

	return $parsed_block;
}
add_filter( 'render_block_data', 'tplbypolylang_filter_template_part_block', 10, 3 );
