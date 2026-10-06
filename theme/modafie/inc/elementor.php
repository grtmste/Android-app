<?php
/**
 * Elementor integration.
 *
 * - Registers the bundled (self-hosted) fonts with Elementor so Global Fonts never pull
 *   from Google.
 * - Supports Elementor Pro Theme Builder locations when Pro is present (optional).
 * - Lets a free-Elementor template replace the header/footer (Customizer → Modafie Theme).
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register Inter and Barlow Condensed as a self-hosted "Modafie" font group.
 * Elementor merges these with array_replace, so they override the Google versions.
 *
 * @param array $fonts Additional fonts.
 * @return array
 */
function modafie_elementor_fonts( $fonts ) {
	$fonts['Inter']            = 'modafie';
	$fonts['Barlow Condensed'] = 'modafie';
	return $fonts;
}
add_filter( 'elementor/fonts/additional_fonts', 'modafie_elementor_fonts' );

/**
 * Font group label in the Elementor font picker.
 *
 * @param array $groups Groups.
 * @return array
 */
function modafie_elementor_font_groups( $groups ) {
	return array_merge( array( 'modafie' => esc_html__( 'Modafie (self-hosted)', 'modafie' ) ), $groups );
}
add_filter( 'elementor/fonts/groups', 'modafie_elementor_font_groups' );

/**
 * Elementor Pro Theme Builder: register all core locations (no-op on free Elementor).
 *
 * @param \ElementorPro\Modules\ThemeBuilder\Classes\Locations_Manager $manager Manager.
 */
function modafie_register_elementor_locations( $manager ) {
	$manager->register_all_core_location();
}
add_action( 'elementor/theme/register_locations', 'modafie_register_elementor_locations' );

/**
 * Print the Pro location if one is assigned. Returns true when Pro handled it.
 *
 * @param string $location header|footer.
 * @return bool
 */
function modafie_do_pro_location( $location ) {
	return function_exists( 'elementor_theme_do_location' ) && elementor_theme_do_location( $location );
}

/**
 * Make sure Elementor's frontend CSS for the header/footer templates is loaded in <head>
 * (avoids a flash of unstyled header).
 */
function modafie_enqueue_template_css() {
	if ( ! did_action( 'elementor/loaded' ) ) {
		return;
	}
	foreach ( array( 'header', 'footer' ) as $part ) {
		$template_id = absint( get_theme_mod( 'modafie_' . $part . '_template', 0 ) );
		if ( $template_id && 'publish' === get_post_status( $template_id ) && class_exists( '\Elementor\Core\Files\CSS\Post' ) ) {
			$css = \Elementor\Core\Files\CSS\Post::create( $template_id );
			$css->enqueue();
		}
	}
}
add_action( 'wp_enqueue_scripts', 'modafie_enqueue_template_css', 20 );

/**
 * Editor-only helper styles (e.g. visual hints for theme animation classes).
 */
function modafie_elementor_editor_styles() {
	wp_enqueue_style( 'modafie-elementor-editor', MODAFIE_URI . '/assets/css/elementor-editor.css', array(), MODAFIE_VERSION );
}
add_action( 'elementor/editor/after_enqueue_styles', 'modafie_elementor_editor_styles' );

/**
 * Add the theme's self-hosted fonts inside the Elementor preview iframe as well
 * (theme.css is already enqueued there via wp_enqueue_scripts).
 */
function modafie_elementor_preview_fonts() {
	wp_enqueue_style( 'modafie-fonts' );
}
add_action( 'elementor/preview/enqueue_styles', 'modafie_elementor_preview_fonts' );

/**
 * Elementor's "Full Width" (header-footer) template has no <main>; add the landmark so the
 * skip link works and screen readers can jump to content.
 */
function modafie_elementor_main_open() {
	echo '<main id="primary" class="mf-main mf-main--elementor">';
}
add_action( 'elementor/page_templates/header-footer/before_content', 'modafie_elementor_main_open' );

/**
 * Close the landmark.
 */
function modafie_elementor_main_close() {
	echo '</main>';
}
add_action( 'elementor/page_templates/header-footer/after_content', 'modafie_elementor_main_close' );

/**
 * Settings of the first Elementor section when it is a background-image hero, else null.
 *
 * @return array|null
 */
function modafie_hero_settings() {
	static $cache = false;
	if ( false !== $cache ) {
		return $cache;
	}
	$cache = null;
	if ( ! is_singular() || ! did_action( 'elementor/loaded' ) || is_customize_preview() || isset( $_GET['elementor-preview'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return $cache;
	}
	$data = get_post_meta( get_queried_object_id(), '_elementor_data', true );
	$data = is_string( $data ) ? json_decode( $data, true ) : $data;
	$first = is_array( $data ) && ! empty( $data[0]['settings'] ) ? $data[0]['settings'] : null;
	if ( $first && ( $first['background_background'] ?? '' ) === 'classic' && ! empty( $first['background_image']['url'] ) ) {
		$cache = $first;
	}
	return $cache;
}

/**
 * WordPress keeps the first content images eager (and marks one fetchpriority=high), assuming
 * they are above the fold. Under a background-image hero they are not, and they would compete
 * with the hero image (the LCP) for bandwidth, so lazy-load them instead.
 *
 * @param array  $attrs   Loading attributes.
 * @param string $tag     Tag name.
 * @param array  $attr    Tag attributes.
 * @param string $context Context.
 * @return array
 */
function modafie_loading_attributes( $attrs, $tag, $attr, $context ) {
	if ( 'img' !== $tag || ! modafie_hero_settings() || in_array( $context, array( 'template', 'wp_get_custom_logo' ), true ) ) {
		return $attrs;
	}
	unset( $attrs['fetchpriority'] );
	$attrs['loading'] = 'lazy';
	return $attrs;
}
add_filter( 'wp_get_loading_optimization_attributes', 'modafie_loading_attributes', 10, 4 );

/**
 * Elementor's own image-loading optimizer: same idea (lazy everything, no fetchpriority on
 * content images) when the hero background is the LCP.
 *
 * @param int $value Threshold.
 * @return int
 */
function modafie_elementor_lazy_threshold( $value ) {
	return modafie_hero_settings() ? 0 : $value;
}
add_filter( 'wp_omit_loading_attr_threshold', 'modafie_elementor_lazy_threshold' );

/**
 * Never give a content image fetchpriority=high under a background-image hero.
 *
 * @param int $pixels Minimum pixels.
 * @return int
 */
function modafie_elementor_priority_pixels( $pixels ) {
	return modafie_hero_settings() ? PHP_INT_MAX : $pixels;
}
add_filter( 'elementor/image-loading-optimization/min_priority_img_pixels', 'modafie_elementor_priority_pixels' );

/**
 * Elementor's optimizer keeps an explicit loading attribute, so add it to rendered image
 * widgets (below a background-image hero, no content image is the LCP).
 *
 * @param string                 $content Widget HTML.
 * @param \Elementor\Widget_Base $widget  Widget.
 * @return string
 */
function modafie_widget_images_lazy( $content, $widget ) {
	if ( ! modafie_hero_settings() || ! in_array( $widget->get_name(), array( 'image', 'image-box', 'image-carousel' ), true ) ) {
		return $content;
	}
	return preg_replace( '/<img(?![^>]*\bloading=)/i', '<img loading="lazy"', $content );
}
add_filter( 'elementor/widget/render_content', 'modafie_widget_images_lazy', 10, 2 );

/**
 * Elementor's image optimizer prepends its own loading="…" even when the tag already has one,
 * leaving duplicate attributes. Wrap its buffer (started later, on get_header) and keep the
 * first occurrence only. Runs only on pages with a background-image hero.
 */
function modafie_dedupe_loading_attr_buffer() {
	if ( is_admin() || ! modafie_hero_settings() ) {
		return;
	}
	ob_start(
		static function ( $html ) {
			return preg_replace_callback(
				'/<img\b[^>]*>/i',
				static function ( $m ) {
					$seen = false;
					return preg_replace_callback(
						'/\sloading=(["\'])[^"\']*\1/i',
						static function ( $a ) use ( &$seen ) {
							if ( $seen ) {
								return '';
							}
							$seen = true;
							return $a[0];
						},
						$m[0]
					);
				},
				$html
			);
		}
	);
}
add_action( 'template_redirect', 'modafie_dedupe_loading_attr_buffer', 1 );

/**
 * Preload the first section's background image (the usual LCP element of a hero) so the
 * browser fetches it before Elementor's CSS is parsed. Handles the mobile variant too.
 */
function modafie_preload_hero_image() {
	$settings = modafie_hero_settings();
	if ( ! $settings ) {
		return;
	}
	$desktop = ! empty( $settings['background_image']['id'] ) ? wp_get_attachment_image_url( (int) $settings['background_image']['id'], 'full' ) : ( $settings['background_image']['url'] ?? '' );
	$mobile  = ! empty( $settings['background_image_mobile']['id'] ) ? wp_get_attachment_image_url( (int) $settings['background_image_mobile']['id'], 'full' ) : ( $settings['background_image_mobile']['url'] ?? '' );
	if ( $desktop && $mobile ) {
		printf( '<link rel="preload" as="image" href="%s" media="(min-width: 768px)" fetchpriority="high">' . "\n", esc_url( $desktop ) );
		printf( '<link rel="preload" as="image" href="%s" media="(max-width: 767px)" fetchpriority="high">' . "\n", esc_url( $mobile ) );
	} elseif ( $desktop ) {
		printf( '<link rel="preload" as="image" href="%s" fetchpriority="high">' . "\n", esc_url( $desktop ) );
	}
}
add_action( 'wp_head', 'modafie_preload_hero_image', 2 );

/**
 * Load jQuery in the footer on the front end (Elementor's frontend scripts already load
 * there), removing ~35 KB of render-blocking JS. Skipped in the editor/preview and when a
 * plugin needs it in <head>: add_filter( 'modafie_jquery_in_footer', '__return_false' ).
 */
function modafie_jquery_to_footer() {
	if ( is_admin() || is_customize_preview() || isset( $_GET['elementor-preview'] ) || ! apply_filters( 'modafie_jquery_in_footer', true ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}
	$scripts = wp_scripts();
	foreach ( array( 'jquery', 'jquery-core', 'jquery-migrate' ) as $handle ) {
		$scripts->add_data( $handle, 'group', 1 );
	}
}
add_action( 'wp_enqueue_scripts', 'modafie_jquery_to_footer', 1 );
