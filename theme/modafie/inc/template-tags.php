<?php
/**
 * Template helpers.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Return an inline SVG icon (original, stroke-based).
 *
 * @param string $name Icon name.
 * @param int    $size Pixel size.
 * @return string SVG markup.
 */
function modafie_icon( $name, $size = 22 ) {
	$paths = array(
		'search'    => '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
		'menu'      => '<path d="M3 7h18M3 12h18M3 17h18"/>',
		'close'     => '<path d="M6 6l12 12M18 6 6 18"/>',
		'chevron'   => '<path d="m6 9 6 6 6-6"/>',
		'arrow'     => '<path d="M5 12h14M13 6l6 6-6 6"/>',
		'user'      => '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
		'bag'       => '<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
		'heart'     => '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
		'instagram' => '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
		'facebook'  => '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8Z"/>',
		'tiktok'    => '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.5 2.5 4.5 5 4.5"/>',
		'youtube'   => '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9 5 3-5 3V9Z" fill="currentColor"/>',
		'linkedin'  => '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
		'pinterest' => '<circle cx="12" cy="12" r="9"/><path d="m11 8-3 13M9.5 14.5c3.5 1.5 7-1 6.5-4.5-.4-3-4.5-4-7-2"/>',
		'x'         => '<path d="m4 4 16 16M20 4 4 20"/>',
		'link'      => '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
	);
	if ( ! isset( $paths[ $name ] ) ) {
		$name = 'link';
	}
	return sprintf(
		'<svg class="mf-icon mf-icon--%1$s" width="%2$d" height="%2$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">%3$s</svg>',
		esc_attr( $name ),
		absint( $size ),
		$paths[ $name ]
	);
}

/**
 * Allowed tags for modafie_icon() output.
 *
 * @return array
 */
function modafie_icon_kses() {
	$common = array(
		'cx'           => true,
		'cy'           => true,
		'r'            => true,
		'd'            => true,
		'x'            => true,
		'y'            => true,
		'rx'           => true,
		'width'        => true,
		'height'       => true,
		'fill'         => true,
		'stroke'       => true,
		'stroke-width' => true,
	);
	return array(
		'svg'    => array(
			'class'           => true,
			'width'           => true,
			'height'          => true,
			'viewbox'         => true,
			'fill'            => true,
			'stroke'          => true,
			'stroke-width'    => true,
			'stroke-linecap'  => true,
			'stroke-linejoin' => true,
			'aria-hidden'     => true,
			'focusable'       => true,
		),
		'path'   => $common,
		'circle' => $common,
		'rect'   => $common,
	);
}

/**
 * Echo an icon.
 *
 * @param string $name Icon name.
 * @param int    $size Size.
 */
function modafie_the_icon( $name, $size = 22 ) {
	echo wp_kses( modafie_icon( $name, $size ), modafie_icon_kses() );
}

/**
 * Guess an icon for a social link URL.
 *
 * @param string $url URL.
 * @return string Icon name.
 */
function modafie_social_icon_for( $url ) {
	$map = array(
		'instagram.com' => 'instagram',
		'facebook.com'  => 'facebook',
		'tiktok.com'    => 'tiktok',
		'youtube.com'   => 'youtube',
		'youtu.be'      => 'youtube',
		'linkedin.com'  => 'linkedin',
		'pinterest.'    => 'pinterest',
		'twitter.com'   => 'x',
		'x.com'         => 'x',
	);
	foreach ( $map as $needle => $icon ) {
		if ( false !== strpos( (string) $url, $needle ) ) {
			return $icon;
		}
	}
	return 'link';
}

/**
 * Announcement bar items from the Customizer ("Text | https://link" per line).
 *
 * @return array<int, array{text: string, url: string}>
 */
function modafie_announcement_items() {
	$raw   = (string) get_theme_mod( 'modafie_announcement_items', '' );
	$items = array();
	foreach ( preg_split( '/\r\n|\r|\n/', $raw ) as $line ) {
		$parts = array_map( 'trim', explode( '|', $line, 2 ) );
		if ( '' !== $parts[0] ) {
			$items[] = array(
				'text' => $parts[0],
				'url'  => isset( $parts[1] ) ? $parts[1] : '',
			);
		}
	}
	return $items;
}

/**
 * Render an Elementor template (library post) by ID. Returns '' when unavailable.
 *
 * @param int $template_id Template post ID.
 * @return string HTML.
 */
function modafie_get_elementor_template( $template_id ) {
	$template_id = absint( $template_id );
	if ( ! $template_id || ! did_action( 'elementor/loaded' ) || 'publish' !== get_post_status( $template_id ) ) {
		return '';
	}
	return \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $template_id, true );
}

/**
 * Whether the current page should show the theme page title.
 *
 * @return bool
 */
function modafie_show_page_title() {
	if ( is_front_page() ) {
		return false;
	}
	if ( did_action( 'elementor/loaded' ) && is_singular() ) {
		$document = \Elementor\Plugin::instance()->documents->get( get_the_ID() );
		// Elementor pages carry their own headings; the theme title would duplicate them.
		if ( $document && $document->is_built_with_elementor() ) {
			return false;
		}
	}
	return true;
}

/**
 * Posted-on meta line.
 */
function modafie_posted_on() {
	$time = sprintf(
		'<time class="entry-date published" datetime="%1$s">%2$s</time>',
		esc_attr( get_the_date( DATE_W3C ) ),
		esc_html( get_the_date() )
	);
	printf(
		'<span class="posted-on">%1$s</span><span class="byline"> &middot; %2$s</span>',
		wp_kses_post( $time ),
		esc_html( get_the_author() )
	);
}

/**
 * Fallback for the primary menu when none is assigned.
 *
 * @param array $args Menu args.
 */
function modafie_menu_fallback( $args ) {
	if ( ! current_user_can( 'edit_theme_options' ) ) {
		return;
	}
	printf(
		'<ul class="%1$s"><li class="menu-item"><a class="mf-menu-link" href="%2$s"><span>%3$s</span></a></li></ul>',
		esc_attr( $args['menu_class'] ?? 'menu' ),
		esc_url( admin_url( 'nav-menus.php' ) ),
		esc_html__( 'Add a menu', 'modafie' )
	);
}
