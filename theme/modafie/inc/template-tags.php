<?php
/**
 * Template helpers.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether the current (or given) post is built with Elementor.
 *
 * @param int|null $post_id Post ID.
 */
function modafie_is_built_with_elementor( $post_id = null ) {
	if ( ! did_action( 'elementor/loaded' ) ) {
		return false;
	}
	$post_id = $post_id ? $post_id : ( is_singular() ? get_queried_object_id() : 0 );
	if ( ! $post_id ) {
		return false;
	}
	$document = \Elementor\Plugin::$instance->documents->get( $post_id );
	return $document && $document->is_built_with_elementor();
}

/**
 * Default announcement messages (one per line).
 */
function modafie_default_announcement() {
	return '';
}

/**
 * Announcement messages as an array.
 *
 * @return string[]
 */
function modafie_announcement_messages() {
	$raw = (string) get_theme_mod( 'modafie_announcement_text', modafie_default_announcement() );
	return array_values( array_filter( array_map( 'trim', preg_split( '/\r\n|\r|\n/', $raw ) ) ) );
}

/**
 * Render an Elementor template (elementor_library post) by ID.
 *
 * @param int $template_id Template post ID.
 * @return bool Whether something was rendered.
 */
function modafie_render_elementor_template( $template_id ) {
	$template_id = absint( $template_id );
	if ( ! $template_id || ! did_action( 'elementor/loaded' ) || 'publish' !== get_post_status( $template_id ) ) {
		return false;
	}
	$html = \Elementor\Plugin::$instance->frontend->get_builder_content_for_display( $template_id, true );
	if ( '' === trim( (string) $html ) ) {
		return false;
	}
	echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Elementor-rendered markup.
	return true;
}

/**
 * Site logo or title.
 */
function modafie_site_branding() {
	if ( has_custom_logo() ) {
		the_custom_logo();
		return;
	}
	printf(
		'<a class="mf-wordmark" href="%1$s" rel="home">%2$s</a>',
		esc_url( home_url( '/' ) ),
		esc_html( get_bloginfo( 'name' ) )
	);
}

/**
 * Inline SVG icon (24px line icons, original artwork).
 *
 * @param string $name Icon name.
 * @param string $label Accessible label; decorative when empty.
 */
function modafie_icon( $name, $label = '' ) {
	$paths = array(
		'menu'    => '<path d="M3 6h18M3 12h18M3 18h18"/>',
		'close'   => '<path d="M5 5l14 14M19 5L5 19"/>',
		'search'  => '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
		'chevron' => '<path d="M6 9l6 6 6-6"/>',
		'arrow'   => '<path d="M4 12h15M13 6l6 6-6 6"/>',
		'prev'    => '<path d="M15 5l-7 7 7 7"/>',
		'next'    => '<path d="M9 5l7 7-7 7"/>',
		'user'    => '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
		'bag'     => '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
	);
	if ( ! isset( $paths[ $name ] ) ) {
		return '';
	}
	$a11y = $label ? sprintf( 'role="img" aria-label="%s"', esc_attr( $label ) ) : 'aria-hidden="true" focusable="false"';
	return sprintf(
		'<svg class="mf-icon mf-icon--%1$s" %2$s width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">%3$s</svg>',
		esc_attr( $name ),
		$a11y,
		$paths[ $name ]
	);
}

/**
 * Allowed SVG markup for wp_kses.
 */
function modafie_svg_kses() {
	return array(
		'svg'    => array( 'class' => true, 'role' => true, 'aria-label' => true, 'aria-hidden' => true, 'focusable' => true, 'width' => true, 'height' => true, 'viewbox' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'stroke-linecap' => true, 'stroke-linejoin' => true ),
		'path'   => array( 'd' => true ),
		'circle' => array( 'cx' => true, 'cy' => true, 'r' => true ),
	);
}

/**
 * Echo an icon.
 *
 * @param string $name Icon name.
 * @param string $label Label.
 */
function modafie_the_icon( $name, $label = '' ) {
	echo wp_kses( modafie_icon( $name, $label ), modafie_svg_kses() );
}

/**
 * Post meta line.
 */
function modafie_posted_on() {
	printf(
		'<span class="mf-meta"><time datetime="%1$s">%2$s</time>%3$s</span>',
		esc_attr( get_the_date( DATE_W3C ) ),
		esc_html( get_the_date() ),
		has_category() ? ' · ' . get_the_category_list( esc_html__( ', ', 'modafie' ) ) : '' // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core-escaped list.
	);
}

/**
 * Fallback for the primary menu when none is assigned: list top-level pages.
 *
 * @param array $args Menu args.
 */
function modafie_menu_fallback( $args ) {
	if ( ! current_user_can( 'edit_theme_options' ) && ! wp_list_pages( array( 'echo' => false ) ) ) {
		return;
	}
	$pages = get_pages( array( 'parent' => 0, 'sort_column' => 'menu_order,post_title', 'number' => 6 ) );
	echo '<ul class="' . esc_attr( $args['menu_class'] ) . '">';
	foreach ( $pages as $page ) {
		printf( '<li class="menu-item"><a href="%1$s">%2$s</a></li>', esc_url( get_permalink( $page ) ), esc_html( get_the_title( $page ) ) );
	}
	echo '</ul>';
}

/**
 * Plain-text meta description set by the demo importer (only if no SEO plugin is active).
 */
function modafie_demo_meta_description() {
	if ( ! is_singular( 'page' ) || defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || class_exists( 'AIOSEO\Plugin\AIOSEO' ) ) {
		return;
	}
	$desc = get_post_meta( get_queried_object_id(), '_modafie_meta_description', true );
	if ( $desc ) {
		printf( '<meta name="description" content="%s">' . "\n", esc_attr( $desc ) );
	}
}
add_action( 'wp_head', 'modafie_demo_meta_description', 2 );
