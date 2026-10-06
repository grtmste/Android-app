<?php
/**
 * Minimal TGM-style installer for the required free Elementor plugin.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Installs/activates required plugins from WordPress.org.
 */
class Modafie_Plugin_Installer {

	/**
	 * Required plugins: slug => main file.
	 *
	 * @var array<string, array{name: string, file: string}>
	 */
	const PLUGINS = array(
		'elementor' => array(
			'name' => 'Elementor',
			'file' => 'elementor/elementor.php',
		),
	);

	/**
	 * Plugin status.
	 *
	 * @param string $slug Plugin slug.
	 * @return string active|inactive|missing
	 */
	public static function status( $slug ) {
		if ( ! isset( self::PLUGINS[ $slug ] ) ) {
			return 'missing';
		}
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$file = self::PLUGINS[ $slug ]['file'];
		if ( is_plugin_active( $file ) ) {
			return 'active';
		}
		return file_exists( WP_PLUGIN_DIR . '/' . $file ) ? 'inactive' : 'missing';
	}

	/**
	 * Install (if needed) and activate a plugin.
	 *
	 * @param string $slug Plugin slug.
	 * @return true|WP_Error
	 */
	public static function ensure_active( $slug ) {
		$status = self::status( $slug );
		if ( 'active' === $status ) {
			return true;
		}

		if ( 'missing' === $status ) {
			if ( ! current_user_can( 'install_plugins' ) ) {
				return new WP_Error( 'modafie_cap', __( 'You are not allowed to install plugins. Ask an administrator to install Elementor.', 'modafie' ) );
			}
			$installed = self::install( $slug );
			if ( is_wp_error( $installed ) ) {
				return $installed;
			}
		}

		if ( ! current_user_can( 'activate_plugins' ) ) {
			return new WP_Error( 'modafie_cap', __( 'You are not allowed to activate plugins.', 'modafie' ) );
		}
		$result = activate_plugin( self::PLUGINS[ $slug ]['file'], '', false, false );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// Stop Elementor's first-run onboarding redirect from hijacking the import.
		delete_transient( 'elementor_activation_redirect' );
		update_option( 'elementor_onboarded', true );
		return true;
	}

	/**
	 * Download and install a plugin from WordPress.org.
	 *
	 * @param string $slug Plugin slug.
	 * @return true|WP_Error
	 */
	private static function install( $slug ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
		require_once ABSPATH . 'wp-admin/includes/plugin.php';

		// Needs direct filesystem access; on hosts that require FTP credentials, install Elementor manually.
		if ( 'direct' !== get_filesystem_method() && ! WP_Filesystem() ) {
			return new WP_Error(
				'modafie_fs',
				sprintf(
					/* translators: %s: plugin install URL. */
					__( 'WordPress needs FTP credentials to install plugins on this server. Install Elementor from %s, then run the import again.', 'modafie' ),
					admin_url( 'plugin-install.php?s=elementor&tab=search&type=term' )
				)
			);
		}

		$api = plugins_api(
			'plugin_information',
			array(
				'slug'   => $slug,
				'fields' => array(
					'sections' => false,
					'banners'  => false,
					'icons'    => false,
				),
			)
		);
		if ( is_wp_error( $api ) ) {
			return $api;
		}

		$skin     = new WP_Ajax_Upgrader_Skin();
		$upgrader = new Plugin_Upgrader( $skin );
		$result   = $upgrader->install( $api->download_link );

		if ( is_wp_error( $result ) ) {
			return $result;
		}
		if ( is_wp_error( $skin->result ) ) {
			return $skin->result;
		}
		if ( $skin->get_errors()->has_errors() ) {
			return $skin->get_errors();
		}
		if ( ! $result ) {
			return new WP_Error( 'modafie_install', __( 'Elementor could not be installed. Please install it from Plugins → Add New.', 'modafie' ) );
		}
		wp_clean_plugins_cache();
		return true;
	}
}
