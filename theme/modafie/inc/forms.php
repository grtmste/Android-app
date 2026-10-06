<?php
/**
 * Lightweight form handling for free Elementor (which has no Form widget).
 *
 * Any HTML widget can hold a form like:
 *
 *   <form class="mf-form" method="post" action="/wp-admin/admin-post.php">
 *     <input type="hidden" name="action" value="modafie_form">
 *     <input type="hidden" name="mf_form_type" value="contact">   (or "newsletter")
 *     <input type="text" name="mf_name"> <input type="email" name="mf_email" required>
 *     <textarea name="mf_message"></textarea>
 *     <button type="submit">Send</button>
 *   </form>
 *
 * theme.js adds the spam-protection fields (honeypot + timestamp). Submissions are emailed to
 * the site admin address. Newsletter sign-ups are also listed under Appearance → Modafie Setup.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Handle a front-end form post.
 */
function modafie_handle_form() {
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- public form on cached pages; protected by honeypot, timing and rate limit.
	$redirect = wp_get_referer() ? wp_get_referer() : home_url( '/' );
	$redirect = remove_query_arg( 'mf_form', $redirect );
	$type     = isset( $_POST['mf_form_type'] ) && 'newsletter' === $_POST['mf_form_type'] ? 'newsletter' : 'contact';
	$fail     = static function ( $code ) use ( $redirect ) {
		wp_safe_redirect( add_query_arg( 'mf_form', $code, $redirect ) . '#mf-form-notice' );
		exit;
	};

	// Honeypot + minimum fill time (3s) to stop basic bots.
	$started = isset( $_POST['mf_ts'] ) ? absint( $_POST['mf_ts'] ) : 0;
	if ( ! empty( $_POST['mf_hp'] ) || ! $started || ( time() * 1000 - $started ) < 3000 ) {
		$fail( 'error' );
	}

	// Rate limit: 5 submissions per 10 minutes per IP.
	$ip_raw = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	$key    = 'mf_form_' . md5( $ip_raw );
	$count  = (int) get_transient( $key );
	if ( $count >= 5 ) {
		$fail( 'limit' );
	}
	set_transient( $key, $count + 1, 10 * MINUTE_IN_SECONDS );

	$email = isset( $_POST['mf_email'] ) ? sanitize_email( wp_unslash( $_POST['mf_email'] ) ) : '';
	if ( ! is_email( $email ) ) {
		$fail( 'invalid' );
	}

	$fields = array();
	foreach ( $_POST as $name => $value ) {
		if ( 0 !== strpos( $name, 'mf_' ) || in_array( $name, array( 'mf_hp', 'mf_ts', 'mf_form_type' ), true ) ) {
			continue;
		}
		$label            = ucwords( str_replace( '_', ' ', substr( sanitize_key( $name ), 3 ) ) );
		$fields[ $label ] = is_array( $value ) ? implode( ', ', array_map( 'sanitize_text_field', wp_unslash( $value ) ) ) : sanitize_textarea_field( wp_unslash( $value ) );
	}
	// phpcs:enable

	if ( 'newsletter' === $type ) {
		$list = get_option( 'modafie_newsletter_signups', array() );
		if ( ! is_array( $list ) ) {
			$list = array();
		}
		$list[ $email ] = gmdate( 'c' );
		update_option( 'modafie_newsletter_signups', array_slice( $list, -5000, null, true ), false );
	}

	$body = '';
	foreach ( $fields as $label => $value ) {
		$body .= $label . ":\n" . $value . "\n\n";
	}
	$body .= 'Page: ' . esc_url_raw( $redirect ) . "\n";

	$subject = 'newsletter' === $type
		/* translators: %s: site name. */
		? sprintf( __( '[%s] New newsletter sign-up', 'modafie' ), wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) )
		/* translators: %s: site name. */
		: sprintf( __( '[%s] New contact form message', 'modafie' ), wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) );

	$sent = wp_mail( get_option( 'admin_email' ), $subject, $body, array( 'Reply-To: ' . $email ) );

	wp_safe_redirect( add_query_arg( 'mf_form', ( $sent || 'newsletter' === $type ) ? 'sent' : 'error', $redirect ) . '#mf-form-notice' );
	exit;
}
add_action( 'admin_post_nopriv_modafie_form', 'modafie_handle_form' );
add_action( 'admin_post_modafie_form', 'modafie_handle_form' );
