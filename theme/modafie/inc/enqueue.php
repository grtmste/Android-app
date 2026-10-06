<?php
/**
 * Front-end and editor assets.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Self-hosted font faces (SIL OFL fonts bundled in assets/fonts).
 *
 * @return string CSS.
 */
function modafie_font_face_css() {
	$latin     = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
	$latin_ext = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
	$faces     = array(
		'Inter'            => array( 'inter', array( 400, 500, 600, 700 ) ),
		'Barlow Condensed' => array( 'barlow-condensed', array( 700, 800 ) ),
	);
	$base      = MODAFIE_URI . '/assets/fonts/';
	$css       = '';
	foreach ( $faces as $family => $def ) {
		foreach ( $def[1] as $weight ) {
			foreach ( array( 'latin' => $latin, 'latin-ext' => $latin_ext ) as $subset => $range ) {
				$css .= sprintf(
					"@font-face{font-family:'%1\$s';font-style:normal;font-display:swap;font-weight:%2\$d;src:url(%3\$s) format('woff2');unicode-range:%4\$s}",
					$family,
					$weight,
					esc_url( $base . $def[0] . '-' . $subset . '-' . $weight . '-normal.woff2' ),
					$range
				);
			}
		}
	}
	// Metric-adjusted fallbacks keep layout shift near zero while web fonts load.
	$css .= "@font-face{font-family:'Inter Fallback';src:local('Arial');ascent-override:96.88%;descent-override:24.15%;line-gap-override:0%;size-adjust:107.12%}";
	$css .= "@font-face{font-family:'Barlow Condensed Fallback';src:local('Arial Narrow'),local('Arial');ascent-override:110%;descent-override:28%;line-gap-override:0%;size-adjust:80%}";
	return $css;
}

/**
 * Flag JS support before first paint so scroll-reveal start states never flash.
 */
function modafie_js_class() {
	wp_print_inline_script_tag( "document.documentElement.classList.add('mf-js');" );
}
add_action( 'wp_head', 'modafie_js_class', 0 );

/**
 * Preload the two most critical font files.
 */
function modafie_preload_fonts() {
	$fonts = array( 'barlow-condensed-latin-800-normal.woff2', 'inter-latin-400-normal.woff2' );
	foreach ( $fonts as $font ) {
		printf(
			'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
			esc_url( MODAFIE_URI . '/assets/fonts/' . $font )
		);
	}
}
add_action( 'wp_head', 'modafie_preload_fonts', 1 );

/**
 * Enqueue front-end styles and scripts.
 */
function modafie_enqueue_assets() {
	wp_register_style( 'modafie-fonts', false, array(), MODAFIE_VERSION );
	wp_enqueue_style( 'modafie-fonts' );
	wp_add_inline_style( 'modafie-fonts', modafie_font_face_css() );

	wp_enqueue_style( 'modafie-theme', MODAFIE_URI . '/assets/css/theme.css', array( 'modafie-fonts' ), MODAFIE_VERSION );
	wp_style_add_data( 'modafie-theme', 'path', MODAFIE_DIR . '/assets/css/theme.css' );

	wp_enqueue_script(
		'modafie-theme',
		MODAFIE_URI . '/assets/js/theme.js',
		array(),
		MODAFIE_VERSION,
		// Footer, not deferred: it runs as soon as it arrives (the page above is already parsed),
		// so the hero text reveal never waits for jQuery/Elementor scripts. That keeps LCP low.
		true
	);

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'modafie_enqueue_assets' );

/**
 * Fonts inside the block editor too.
 */
function modafie_block_editor_assets() {
	wp_register_style( 'modafie-editor-fonts', false, array(), MODAFIE_VERSION );
	wp_enqueue_style( 'modafie-editor-fonts' );
	wp_add_inline_style( 'modafie-editor-fonts', modafie_font_face_css() );
}
add_action( 'enqueue_block_editor_assets', 'modafie_block_editor_assets' );
