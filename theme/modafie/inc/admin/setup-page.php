<?php
/**
 * Appearance → Modafie Setup: one-click demo import, plus activation notice.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register the admin page.
 */
function modafie_setup_menu() {
	add_theme_page(
		esc_html__( 'Modafie Setup', 'modafie' ),
		esc_html__( 'Modafie Setup', 'modafie' ),
		'manage_options',
		'modafie-setup',
		'modafie_setup_page'
	);
}
add_action( 'admin_menu', 'modafie_setup_menu' );

/**
 * Activation / recommendation notice.
 */
function modafie_admin_notice() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$screen = get_current_screen();
	if ( $screen && 'appearance_page_modafie-setup' === $screen->id ) {
		return;
	}
	if ( get_option( 'modafie_show_setup_notice' ) ) {
		?>
		<div class="notice notice-info is-dismissible modafie-setup-notice" data-nonce="<?php echo esc_attr( wp_create_nonce( 'modafie_dismiss' ) ); ?>">
			<p><strong><?php esc_html_e( 'Welcome to Modafie!', 'modafie' ); ?></strong> <?php esc_html_e( 'Import the complete Modafie site (pages, images, menus, global colours and fonts) as editable Elementor content in one click.', 'modafie' ); ?></p>
			<p><a class="button button-primary" href="<?php echo esc_url( admin_url( 'themes.php?page=modafie-setup' ) ); ?>"><?php esc_html_e( 'Import Modafie demo content', 'modafie' ); ?></a></p>
		</div>
		<?php
		return;
	}
	if ( 'active' !== Modafie_Plugin_Installer::status( 'elementor' ) && current_user_can( 'install_plugins' ) ) {
		?>
		<div class="notice notice-warning">
			<p><?php esc_html_e( 'The Modafie theme is designed for the free Elementor page builder.', 'modafie' ); ?>
				<a href="<?php echo esc_url( admin_url( 'themes.php?page=modafie-setup' ) ); ?>"><?php esc_html_e( 'Install & activate Elementor', 'modafie' ); ?></a>
			</p>
		</div>
		<?php
	}
}
add_action( 'admin_notices', 'modafie_admin_notice' );

/**
 * Dismiss the notice (AJAX).
 */
function modafie_dismiss_notice() {
	check_ajax_referer( 'modafie_dismiss', 'nonce' );
	if ( current_user_can( 'manage_options' ) ) {
		delete_option( 'modafie_show_setup_notice' );
	}
	wp_send_json_success();
}
add_action( 'wp_ajax_modafie_dismiss_notice', 'modafie_dismiss_notice' );

/**
 * Admin assets.
 *
 * @param string $hook Hook suffix.
 */
function modafie_admin_assets( $hook ) {
	if ( 'appearance_page_modafie-setup' === $hook ) {
		wp_enqueue_style( 'modafie-admin', MODAFIE_URI . '/assets/css/admin.css', array(), MODAFIE_VERSION );
		wp_enqueue_script( 'modafie-admin', MODAFIE_URI . '/assets/js/admin-import.js', array(), MODAFIE_VERSION, true );
		wp_localize_script(
			'modafie-admin',
			'modafieImport',
			array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'nonce'   => wp_create_nonce( 'modafie_import' ),
				'steps'   => array_keys( Modafie_Importer::steps() ),
				'i18n'    => array(
					'running' => __( 'Importing…', 'modafie' ),
					'done'    => __( 'Import complete', 'modafie' ),
					'failed'  => __( 'Import stopped. See details below and try again.', 'modafie' ),
					'confirm' => __( 'This will create pages, media, menus and Elementor settings. Continue?', 'modafie' ),
				),
			)
		);
	} elseif ( get_option( 'modafie_show_setup_notice' ) ) {
		wp_add_inline_script(
			'common',
			"document.addEventListener('click',function(e){var b=e.target.closest('.modafie-setup-notice .notice-dismiss');if(!b)return;var n=b.closest('.modafie-setup-notice');var d=new FormData();d.append('action','modafie_dismiss_notice');d.append('nonce',n.dataset.nonce);fetch(ajaxurl,{method:'POST',body:d,credentials:'same-origin'});});"
		);
	}
}
add_action( 'admin_enqueue_scripts', 'modafie_admin_assets' );

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
	$reset  = ! empty( $_POST['reset'] );
	if ( ! array_key_exists( $step, Modafie_Importer::steps() ) ) {
		wp_send_json_error( array( 'message' => 'Unknown step.' ), 400 );
	}
	$result = Modafie_Importer::run_step( $step, $offset, array( 'reset' => $reset ) );
	if ( is_wp_error( $result ) ) {
		wp_send_json_error( array( 'message' => $result->get_error_message() ) );
	}
	wp_send_json_success( $result );
}
add_action( 'wp_ajax_modafie_import', 'modafie_ajax_import' );

/**
 * Render the setup page.
 */
function modafie_setup_page() {
	$manifest  = Modafie_Importer::manifest();
	$imported  = get_option( 'modafie_demo_imported' );
	$elementor = Modafie_Plugin_Installer::status( 'elementor' );
	$signups   = get_option( 'modafie_newsletter_signups', array() );
	?>
	<div class="wrap modafie-setup">
		<div class="modafie-setup__hero">
			<div>
				<h1><?php esc_html_e( 'Modafie Setup', 'modafie' ); ?></h1>
				<p><?php esc_html_e( 'One click recreates the full Modafie site with Elementor. Every heading, text block and image stays editable.', 'modafie' ); ?></p>
			</div>
		</div>

		<?php if ( is_wp_error( $manifest ) ) : ?>
			<div class="notice notice-error"><p><?php echo esc_html( $manifest->get_error_message() ); ?></p></div>
		<?php else : ?>
			<?php if ( isset( $manifest['source'] ) && 'placeholder' === $manifest['source'] ) : ?>
				<div class="notice notice-warning inline modafie-notice-placeholder">
					<p><strong><?php esc_html_e( 'Placeholder content.', 'modafie' ); ?></strong> <?php esc_html_e( 'This package was built before modafie.io could be crawled, so it contains layout-ready placeholder text and images. Rebuild the package with the crawler (see README) to ship the real content.', 'modafie' ); ?></p>
				</div>
			<?php endif; ?>

			<div class="modafie-setup__card">
				<h2><?php esc_html_e( 'Import Modafie demo content', 'modafie' ); ?></h2>
				<p>
					<?php
					printf(
						/* translators: 1: pages, 2: media files, 3: templates. */
						esc_html__( 'Includes %1$d pages, %2$d media files and %3$d reusable Elementor templates. Safe to run again: nothing is duplicated.', 'modafie' ),
						count( isset( $manifest['pages'] ) ? $manifest['pages'] : array() ),
						count( isset( $manifest['media'] ) ? $manifest['media'] : array() ),
						count( isset( $manifest['templates'] ) ? $manifest['templates'] : array() )
					);
					?>
				</p>
				<?php if ( 'active' !== $elementor ) : ?>
					<p><em><?php echo 'inactive' === $elementor ? esc_html__( 'Elementor is installed but inactive. It will be activated.', 'modafie' ) : esc_html__( 'Elementor is not installed yet. It will be downloaded from WordPress.org and activated.', 'modafie' ); ?></em></p>
				<?php endif; ?>
				<?php if ( $imported ) : ?>
					<p>
						<?php
						/* translators: %s: date. */
						printf( esc_html__( 'Last imported: %s.', 'modafie' ), esc_html( wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), (int) $imported['time'] ) ) );
						?>
						<label><input type="checkbox" id="modafie-reset" value="1"> <?php esc_html_e( 'Also reset pages and templates I have edited since', 'modafie' ); ?></label>
					</p>
				<?php endif; ?>

				<p><button type="button" class="button button-primary button-hero modafie-import-btn" id="modafie-import"><?php esc_html_e( 'Import Modafie demo content', 'modafie' ); ?></button></p>

				<div class="modafie-progress" aria-hidden="true"><span></span></div>
				<ol class="modafie-steps" id="modafie-steps">
					<?php foreach ( Modafie_Importer::steps() as $modafie_id => $modafie_label ) : ?>
						<li data-step="<?php echo esc_attr( $modafie_id ); ?>"><span><?php echo esc_html( $modafie_label ); ?></span><span class="modafie-step-detail"></span></li>
					<?php endforeach; ?>
				</ol>
				<div class="modafie-log" id="modafie-log" role="log" aria-live="polite"></div>
				<p id="modafie-done" hidden>
					<a class="button button-primary" id="modafie-view" href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'View site', 'modafie' ); ?></a>
					<a class="button" id="modafie-edit" href="#"><?php esc_html_e( 'Edit homepage with Elementor', 'modafie' ); ?></a>
				</p>
			</div>
		<?php endif; ?>

		<div class="modafie-setup__card">
			<h2><?php esc_html_e( 'Editing your site', 'modafie' ); ?></h2>
			<ul>
				<li><?php esc_html_e( 'Pages: Pages → hover a page → “Edit with Elementor”.', 'modafie' ); ?></li>
				<li><?php esc_html_e( 'Colours & fonts for the whole site: Elementor editor → ☰ → Site Settings → Global Colors / Global Fonts.', 'modafie' ); ?></li>
				<li><?php esc_html_e( 'Header menus, announcement bar, footer template: Appearance → Customize → Modafie Theme, and Appearance → Menus.', 'modafie' ); ?></li>
				<li><?php esc_html_e( 'Reusable sections: Templates → Saved Templates (insert via the folder icon in the Elementor editor).', 'modafie' ); ?></li>
				<li><?php esc_html_e( 'Animations: select any widget → Advanced → Motion Effects (entrance animation) or add a Modafie class under Advanced → CSS Classes (see README).', 'modafie' ); ?></li>
			</ul>
		</div>

		<?php if ( is_array( $signups ) && $signups ) : ?>
			<div class="modafie-setup__card">
				<h2>
					<?php
					/* translators: %d: count. */
					printf( esc_html__( 'Newsletter sign-ups (%d)', 'modafie' ), count( $signups ) );
					?>
				</h2>
				<textarea readonly rows="6" class="large-text code"><?php echo esc_textarea( implode( "\n", array_keys( $signups ) ) ); ?></textarea>
			</div>
		<?php endif; ?>
	</div>
	<?php
}
