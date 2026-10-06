<?php
/**
 * Stable contact links: /whatsapp/ and /instagram/.
 *
 * Buttons and menu items point at these URLs, so changing the number or profile in
 * Customizer → Modafie Header & Footer updates every link on the site at once.
 * /whatsapp/ falls back to the "Get an offer" page while no number is set.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Rewrite rules.
 */
function modafie_contact_rewrites() {
	add_rewrite_rule( '^whatsapp/?$', 'index.php?modafie_contact=whatsapp', 'top' );
	add_rewrite_rule( '^instagram/?$', 'index.php?modafie_contact=instagram', 'top' );
}
add_action( 'init', 'modafie_contact_rewrites' );

/**
 * Query var.
 *
 * @param string[] $vars Vars.
 */
function modafie_contact_query_var( $vars ) {
	$vars[] = 'modafie_contact';
	return $vars;
}
add_filter( 'query_vars', 'modafie_contact_query_var' );

/**
 * Destination of a contact link.
 *
 * @param string $channel whatsapp|instagram.
 */
function modafie_contact_url( $channel ) {
	if ( 'whatsapp' === $channel ) {
		$number = preg_replace( '/\D+/', '', (string) get_theme_mod( 'modafie_whatsapp_number', '' ) );
		if ( $number ) {
			$message = (string) get_theme_mod( 'modafie_whatsapp_message', '' );
			return 'https://wa.me/' . $number . ( '' !== $message ? '?text=' . rawurlencode( $message ) : '' );
		}
	}
	if ( 'instagram' === $channel ) {
		$url = (string) get_theme_mod( 'modafie_instagram_url', '' );
		if ( $url ) {
			return $url;
		}
	}
	$offer = get_page_by_path( 'get-an-offer' );
	return $offer ? get_permalink( $offer ) : home_url( '/' );
}

/**
 * Redirect /whatsapp/ and /instagram/.
 */
function modafie_contact_redirect() {
	$channel = get_query_var( 'modafie_contact' );
	if ( in_array( $channel, array( 'whatsapp', 'instagram' ), true ) ) {
		wp_redirect( esc_url_raw( modafie_contact_url( $channel ) ), 302, 'Modafie' ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect -- external chat/profile URL by design.
		exit;
	}
}
add_action( 'template_redirect', 'modafie_contact_redirect' );

/**
 * Register the rules immediately when the theme is activated.
 */
function modafie_contact_flush() {
	modafie_contact_rewrites();
	flush_rewrite_rules( false );
}
add_action( 'after_switch_theme', 'modafie_contact_flush' );
