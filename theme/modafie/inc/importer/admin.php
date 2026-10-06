<?php
/**
 * Admin UI for the one-click import: activation notice, Appearance → Import Modafie Demo, AJAX endpoint.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Show the notice after the theme is activated.
 */
function modafie_after_switch_theme() {
	delete_option( 'modafie_import_notice_dismissed' );
}
add_action( 'after_switch_theme', 'modafie_after_switch_theme' );

/**
 * Admin page.
 */
function modafie_import_menu() {
	add_theme_page(
		esc_html__( 'Import Modafie Demo', 'modafie' ),
		esc_html__( 'Import Modafie Demo', 'modafie' ),
		'manage_options',
		'modafie-import',
		'modafie_import_page'
	);
}
add_action( 'admin_menu', 'modafie_import_menu' );

/**
 * Activation notice.
 */
function modafie_import_notice() {
	if ( ! current_user_can( 'manage_options' ) || get_option( Modafie_Importer::DONE ) || get_option( 'modafie_import_notice_dismissed' ) ) {
		return;
	}
	$screen = get_current_screen();
	if ( $screen && 'appearance_page_modafie-import' === $screen->id ) {
		return;
	}
	?>
	<div class="notice notice-info is-dismissible mf-import-notice" data-mf-dismiss="<?php echo esc_attr( wp_create_nonce( 'modafie_dismiss' ) ); ?>">
		<p><strong><?php esc_html_e( 'Welcome to Modafie!', 'modafie' ); ?></strong> <?php esc_html_e( 'Import the full Modafie site (pages, images, menus, Elementor global styles) in one click. Every text and image stays editable in Elementor.', 'modafie' ); ?></p>
		<p><a class="button button-primary" href="<?php echo esc_url( admin_url( 'themes.php?page=modafie-import' ) ); ?>"><?php esc_html_e( 'Import Modafie demo content', 'modafie' ); ?></a></p>
	</div>
	<script>
	document.addEventListener('click', function (e) {
		var n = e.target.closest('.mf-import-notice .notice-dismiss');
		if (!n) { return; }
		var box = n.closest('.mf-import-notice');
		var body = new FormData();
		body.append('action', 'modafie_dismiss_import_notice');
		body.append('_wpnonce', box.getAttribute('data-mf-dismiss'));
		fetch(ajaxurl, { method: 'POST', body: body, credentials: 'same-origin' });
	});
	</script>
	<?php
}
add_action( 'admin_notices', 'modafie_import_notice' );

/**
 * Dismiss notice.
 */
function modafie_dismiss_import_notice() {
	check_ajax_referer( 'modafie_dismiss' );
	if ( current_user_can( 'manage_options' ) ) {
		update_option( 'modafie_import_notice_dismissed', 1 );
	}
	wp_send_json_success();
}
add_action( 'wp_ajax_modafie_dismiss_import_notice', 'modafie_dismiss_import_notice' );

/**
 * Assets for the import page.
 *
 * @param string $hook Hook suffix.
 */
function modafie_import_assets( $hook ) {
	if ( 'appearance_page_modafie-import' !== $hook ) {
		return;
	}
	wp_enqueue_style( 'modafie-import', MODAFIE_URI . '/assets/css/admin-import.css', array(), MODAFIE_VERSION );
	wp_enqueue_script( 'modafie-import', MODAFIE_URI . '/assets/js/admin-import.js', array(), MODAFIE_VERSION, true );
	wp_localize_script(
		'modafie-import',
		'modafieImport',
		array(
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'   => wp_create_nonce( 'modafie_import' ),
			'steps'   => Modafie_Importer::$steps,
			'i18n'    => array(
				'running' => esc_html__( 'Importing…', 'modafie' ),
				'done'    => esc_html__( 'Import complete', 'modafie' ),
				'failed'  => esc_html__( 'Import stopped', 'modafie' ),
				'retry'   => esc_html__( 'Try again', 'modafie' ),
				'confirm' => esc_html__( 'Run the import again? Demo pages, templates and menus will be updated in place (nothing is duplicated). Your other content is not touched.', 'modafie' ),
			),
		)
	);
}
add_action( 'admin_enqueue_scripts', 'modafie_import_assets' );

/**
 * Render the import page.
 */
function modafie_import_page() {
	$importer = new Modafie_Importer();
	$status   = $importer->status();
	$labels   = array(
		'plugins'   => __( 'Check / install & activate Elementor', 'modafie' ),
		'kit'       => __( 'Apply global colours, fonts & buttons (Elementor Site Settings)', 'modafie' ),
		'media'     => __( 'Import images & media into the Media Library', 'modafie' ),
		'templates' => __( 'Save every section as a reusable Elementor template', 'modafie' ),
		'pages'     => __( 'Create pages with Elementor content & set the homepage', 'modafie' ),
		'menus'     => __( 'Build menus', 'modafie' ),
		'finalize'  => __( 'Header/footer settings & regenerate Elementor CSS', 'modafie' ),
	);
	?>
	<div class="wrap mf-import">
		<h1><?php esc_html_e( 'Import Modafie demo', 'modafie' ); ?></h1>
		<p class="mf-import__lead">
			<?php
			printf(
				/* translators: 1: pages, 2: media, 3: templates. */
				esc_html__( 'Rebuilds the Modafie site on this WordPress install: %1$d pages, %2$d media files and %3$d section templates. Everything is bundled inside the theme — no external server is needed (only WordPress.org, if Elementor has to be installed).', 'modafie' ),
				(int) $status['counts']['pages'],
				(int) $status['counts']['media'],
				(int) $status['counts']['templates']
			);
			?>
		</p>
		<?php if ( 'placeholder' === $status['source'] ) : ?>
			<div class="notice notice-warning inline"><p>
				<?php esc_html_e( 'This copy of the theme ships with PLACEHOLDER demo content (the live modafie.io site could not be scraped when the theme was built). Layout, styles and animations are final; to swap in the real copy and images, run the scraper and rebuild the demo (see README.md → "Rebuilding the demo from modafie.io"), or simply edit the pages in Elementor.', 'modafie' ); ?>
			</p></div>
		<?php endif; ?>

		<ol class="mf-import__steps">
			<?php foreach ( Modafie_Importer::$steps as $step ) : ?>
				<li data-step="<?php echo esc_attr( $step ); ?>"><span class="mf-import__dot" aria-hidden="true"></span><span class="mf-import__label"><?php echo esc_html( $labels[ $step ] ); ?></span><span class="mf-import__msg"></span></li>
			<?php endforeach; ?>
		</ol>

		<p>
			<button type="button" class="button button-primary button-hero" id="mf-import-start" data-imported="<?php echo $status['imported'] ? '1' : '0'; ?>">
				<?php echo $status['imported'] ? esc_html__( 'Re-run the import', 'modafie' ) : esc_html__( 'Import Modafie demo content', 'modafie' ); ?>
			</button>
		</p>
		<div class="mf-import__result" id="mf-import-result" hidden>
			<p><strong><?php esc_html_e( 'Your site is ready.', 'modafie' ); ?></strong></p>
			<p>
				<a class="button button-primary" id="mf-import-view" href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'View site', 'modafie' ); ?></a>
				<a class="button" id="mf-import-edit" href="#"><?php esc_html_e( 'Edit the homepage with Elementor', 'modafie' ); ?></a>
				<a class="button" href="<?php echo esc_url( admin_url( 'customize.php?autofocus[section]=modafie_header_footer' ) ); ?>"><?php esc_html_e( 'Header & footer settings', 'modafie' ); ?></a>
			</p>
		</div>
		<div class="mf-import__log" id="mf-import-log" role="log" aria-live="polite"></div>
		<?php if ( $status['imported'] && is_array( $status['info'] ) ) : ?>
			<p class="description">
				<?php
				/* translators: %s: date. */
				printf( esc_html__( 'Last imported: %s', 'modafie' ), esc_html( wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), (int) $status['info']['time'] ) ) );
				?>
			</p>
		<?php endif; ?>
	</div>
	<?php
}

/**
 * AJAX: run one import step.
 */
function modafie_ajax_import() {
	check_ajax_referer( 'modafie_import', 'nonce' );
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( array( 'message' => __( 'Permission denied.', 'modafie' ) ), 403 );
	}
	$step   = isset( $_POST['step'] ) ? sanitize_key( wp_unslash( $_POST['step'] ) ) : '';
	$offset = isset( $_POST['offset'] ) ? absint( $_POST['offset'] ) : 0;
	$result = ( new Modafie_Importer() )->run( $step, $offset );
	if ( is_wp_error( $result ) ) {
		wp_send_json_error( array( 'message' => $result->get_error_message() ), 500 );
	}
	wp_send_json_success( $result );
}
add_action( 'wp_ajax_modafie_import', 'modafie_ajax_import' );
