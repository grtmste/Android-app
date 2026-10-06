<?php
/**
 * Front-end assets. Everything is local: no CDN, no Google Fonts requests.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueue theme CSS and JS.
 */
function modafie_enqueue_assets() {
	$ver = MODAFIE_VERSION;
	wp_enqueue_style( 'modafie-fonts', MODAFIE_URI . '/assets/css/fonts.css', array(), $ver );
	wp_enqueue_style( 'modafie', MODAFIE_URI . '/assets/css/theme.css', array( 'modafie-fonts' ), $ver );
	wp_style_add_data( 'modafie', 'path', MODAFIE_DIR . '/assets/css/theme.css' );

	wp_enqueue_script(
		'modafie',
		MODAFIE_URI . '/assets/js/theme.js',
		array(),
		$ver,
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
	wp_localize_script(
		'modafie',
		'modafieTheme',
		array(
			'ajaxUrl'       => admin_url( 'admin-ajax.php' ),
			'hideOnScroll'  => (bool) get_theme_mod( 'modafie_header_hide_on_scroll', true ),
			'i18n'          => array(
				'prev'    => esc_html__( 'Previous', 'modafie' ),
				'next'    => esc_html__( 'Next', 'modafie' ),
				'sending' => esc_html__( 'Sending…', 'modafie' ),
				'error'   => esc_html__( 'Something went wrong. Please try again.', 'modafie' ),
			),
		)
	);

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'modafie_enqueue_assets' );

/**
 * Preload the two above-the-fold font files and flag JS support before first paint
 * (lets CSS hide `.mf-reveal` text only when JS will reveal it — no flash, no CLS).
 */
function modafie_head_early() {
	$fonts = array( 'inter-latin.woff2', 'barlow-condensed-800-latin.woff2' );
	foreach ( $fonts as $font ) {
		printf(
			'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
			esc_url( MODAFIE_URI . '/assets/fonts/' . $font )
		);
	}
	wp_print_inline_script_tag( "document.documentElement.classList.add('mf-js');" );
}
add_action( 'wp_head', 'modafie_head_early', 1 );

/**
 * Block editor: same fonts.
 */
function modafie_block_editor_assets() {
	wp_enqueue_style( 'modafie-fonts', MODAFIE_URI . '/assets/css/fonts.css', array(), MODAFIE_VERSION );
}
add_action( 'enqueue_block_editor_assets', 'modafie_block_editor_assets' );
