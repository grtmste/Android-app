<?php
/**
 * Modafie Form submissions: validation, storage (Appearance → Form submissions) and e-mail.
 *
 * The recipient and field definitions are read server-side from the Elementor widget settings
 * (never from the request), so the endpoint cannot be abused as an open mail relay.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

const MODAFIE_SUBMISSIONS_OPTION = 'modafie_form_submissions';

/**
 * Store a submission (newest first, capped at 500; older entries remain in the e-mail inbox).
 *
 * @param array $entry Entry.
 */
function modafie_store_submission( $entry ) {
	$log = get_option( MODAFIE_SUBMISSIONS_OPTION, array() );
	$log = is_array( $log ) ? $log : array();
	array_unshift( $log, $entry );
	update_option( MODAFIE_SUBMISSIONS_OPTION, array_slice( $log, 0, 500 ), false );
}

/**
 * Appearance → Form submissions.
 */
function modafie_submissions_menu() {
	add_theme_page( esc_html__( 'Form submissions', 'modafie' ), esc_html__( 'Form submissions', 'modafie' ), 'manage_options', 'modafie-submissions', 'modafie_submissions_page' );
}
add_action( 'admin_menu', 'modafie_submissions_menu' );

/**
 * Render the submissions list.
 */
function modafie_submissions_page() {
	if ( isset( $_POST['modafie_clear_submissions'] ) && check_admin_referer( 'modafie_clear_submissions' ) ) {
		delete_option( MODAFIE_SUBMISSIONS_OPTION );
	}
	$log = (array) get_option( MODAFIE_SUBMISSIONS_OPTION, array() );
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Form submissions', 'modafie' ); ?></h1>
		<p><?php esc_html_e( 'Entries sent through the Modafie Form widget (latest 500). Each one is also e-mailed to the address set in the widget.', 'modafie' ); ?></p>
		<table class="widefat striped">
			<thead><tr><th><?php esc_html_e( 'Date', 'modafie' ); ?></th><th><?php esc_html_e( 'Form', 'modafie' ); ?></th><th><?php esc_html_e( 'Fields', 'modafie' ); ?></th><th><?php esc_html_e( 'Page', 'modafie' ); ?></th></tr></thead>
			<tbody>
			<?php if ( ! $log ) : ?>
				<tr><td colspan="4"><?php esc_html_e( 'No submissions yet.', 'modafie' ); ?></td></tr>
			<?php endif; ?>
			<?php foreach ( $log as $entry ) : ?>
				<tr>
					<td><?php echo esc_html( wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), (int) $entry['time'] ) ); ?></td>
					<td><?php echo esc_html( $entry['form'] ); ?></td>
					<td>
						<?php foreach ( (array) $entry['values'] as $v ) : ?>
							<strong><?php echo esc_html( $v['label'] ); ?>:</strong> <?php echo nl2br( esc_html( $v['value'] ) ); ?><br>
						<?php endforeach; ?>
					</td>
					<td><a href="<?php echo esc_url( get_permalink( (int) $entry['post'] ) ); ?>"><?php echo esc_html( get_the_title( (int) $entry['post'] ) ); ?></a></td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<?php if ( $log ) : ?>
			<form method="post" style="margin-top:16px"><?php wp_nonce_field( 'modafie_clear_submissions' ); ?><button class="button" name="modafie_clear_submissions" value="1" onclick="return confirm('<?php echo esc_js( __( 'Delete all stored submissions?', 'modafie' ) ); ?>')"><?php esc_html_e( 'Delete all', 'modafie' ); ?></button></form>
		<?php endif; ?>
	</div>
	<?php
}

/**
 * Normalised key for a form field definition.
 *
 * @param array $field Field settings.
 * @param int   $index Index.
 */
function modafie_form_field_key( $field, $index ) {
	$key = sanitize_key( $field['field_name'] ?? '' );
	if ( '' === $key ) {
		$key = sanitize_key( $field['field_label'] ?? '' );
	}
	return '' === $key ? 'field_' . absint( $index ) : $key;
}

/**
 * Find an element by ID inside Elementor data.
 *
 * @param array  $elements Elementor elements.
 * @param string $id       Element ID.
 * @return array|null
 */
function modafie_find_elementor_element( $elements, $id ) {
	foreach ( (array) $elements as $element ) {
		if ( isset( $element['id'] ) && $element['id'] === $id ) {
			return $element;
		}
		if ( ! empty( $element['elements'] ) ) {
			$found = modafie_find_elementor_element( $element['elements'], $id );
			if ( $found ) {
				return $found;
			}
		}
	}
	return null;
}

/**
 * Handle a submission (AJAX → JSON, plain POST → redirect back).
 */
function modafie_handle_form() {
	// phpcs:disable WordPress.Security.NonceVerification.Missing -- public form; protected by honeypot, timing and rate limit (nonces break with full-page caching).
	$is_ajax = wp_doing_ajax();
	$post_id = isset( $_POST['mf_post'] ) ? absint( $_POST['mf_post'] ) : 0;
	$form_id = isset( $_POST['mf_form_id'] ) ? sanitize_key( wp_unslash( $_POST['mf_form_id'] ) ) : '';
	$ts      = isset( $_POST['mf_ts'] ) ? absint( $_POST['mf_ts'] ) : 0;
	$hp      = isset( $_POST['mf_hp'] ) ? sanitize_text_field( wp_unslash( $_POST['mf_hp'] ) ) : '';
	$input   = isset( $_POST['mf_fields'] ) && is_array( $_POST['mf_fields'] ) ? wp_unslash( $_POST['mf_fields'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitized per field below.
	// phpcs:enable

	$fail = static function ( $message, $errors = array() ) use ( $is_ajax ) {
		if ( $is_ajax ) {
			wp_send_json_error( array( 'message' => $message, 'errors' => $errors ), 400 );
		}
		wp_die( esc_html( $message ), esc_html__( 'Form error', 'modafie' ), array( 'response' => 400, 'back_link' => true ) );
	};

	$raw = $post_id ? get_post_meta( $post_id, '_elementor_data', true ) : '';
	$data = is_string( $raw ) ? json_decode( $raw, true ) : $raw;
	$element = $data ? modafie_find_elementor_element( $data, $form_id ) : null;
	if ( ! $element || 'mf-form' !== ( $element['widgetType'] ?? '' ) ) {
		$fail( __( 'This form is no longer available.', 'modafie' ) );
	}
	if ( '' !== $hp || ( $ts && time() - $ts < 2 ) ) {
		$fail( __( 'Submission rejected.', 'modafie' ) );
	}

	$ip_hash = 'mf_form_' . md5( ( isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '' ) . wp_salt() );
	$count   = (int) get_transient( $ip_hash );
	if ( $count >= 10 ) {
		$fail( __( 'Too many submissions. Please try again later.', 'modafie' ) );
	}

	$settings = $element['settings'] ?? array();
	$defs     = $settings['fields'] ?? array();
	$values   = array();
	$errors   = array();
	$reply_to = '';
	foreach ( $defs as $i => $def ) {
		$key   = modafie_form_field_key( $def, $i );
		$type  = $def['field_type'] ?? 'text';
		$label = $def['field_label'] ?? $key;
		$value = isset( $input[ $key ] ) ? ( 'textarea' === $type ? sanitize_textarea_field( $input[ $key ] ) : sanitize_text_field( $input[ $key ] ) ) : '';
		if ( 'email' === $type && '' !== $value ) {
			if ( ! is_email( $value ) ) {
				$errors[ $key ] = __( 'Please enter a valid e-mail address.', 'modafie' );
			} elseif ( ! $reply_to ) {
				$reply_to = $value;
			}
		}
		if ( 'checkbox' === $type ) {
			$value = '' !== $value ? __( 'Yes', 'modafie' ) : '';
		}
		if ( 'yes' === ( $def['required'] ?? '' ) && '' === $value ) {
			$errors[ $key ] = __( 'This field is required.', 'modafie' );
		}
		$values[ $key ] = array( 'label' => $label, 'value' => $value );
	}
	if ( $errors ) {
		$fail( __( 'Please check the highlighted fields.', 'modafie' ), $errors );
	}
	set_transient( $ip_hash, $count + 1, HOUR_IN_SECONDS );

	$form_name = ! empty( $settings['form_name'] ) ? $settings['form_name'] : __( 'Form', 'modafie' );
	$lines     = array();
	foreach ( $values as $v ) {
		$lines[] = $v['label'] . ': ' . $v['value'];
	}
	$body = implode( "\n", $lines ) . "\n\n" . sprintf( /* translators: %s: page URL. */ __( 'Sent from: %s', 'modafie' ), get_permalink( $post_id ) );

	modafie_store_submission(
		array(
			'time'    => time(),
			'form'    => $form_name,
			'form_id' => $form_id,
			'post'    => $post_id,
			'values'  => $values,
		)
	);

	$to = ! empty( $settings['email_to'] ) && is_email( $settings['email_to'] ) ? $settings['email_to'] : get_option( 'admin_email' );
	$headers = $reply_to ? array( 'Reply-To: ' . $reply_to ) : array();
	/* translators: 1: site name, 2: form name. */
	wp_mail( $to, sprintf( __( '[%1$s] New %2$s submission', 'modafie' ), get_bloginfo( 'name' ), $form_name ), $body, $headers );

	$message  = ! empty( $settings['success_message'] ) ? $settings['success_message'] : __( 'Thanks!', 'modafie' );
	$redirect = ! empty( $settings['redirect_to']['url'] ) ? $settings['redirect_to']['url'] : '';
	if ( $is_ajax ) {
		wp_send_json_success( array( 'message' => $message, 'redirect' => $redirect ? esc_url_raw( $redirect ) : '' ) );
	}
	$back = $redirect ? $redirect : add_query_arg( array( 'mf_form' => 'sent', 'mf_fid' => $form_id ), get_permalink( $post_id ) );
	wp_safe_redirect( $back );
	exit;
}
add_action( 'admin_post_modafie_form', 'modafie_handle_form' );
add_action( 'admin_post_nopriv_modafie_form', 'modafie_handle_form' );
add_action( 'wp_ajax_modafie_form', 'modafie_handle_form' );
add_action( 'wp_ajax_nopriv_modafie_form', 'modafie_handle_form' );
