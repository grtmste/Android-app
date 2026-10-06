<?php
/**
 * Modafie theme bootstrap.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

define( 'MODAFIE_VERSION', '1.0.0' );
define( 'MODAFIE_DIR', get_template_directory() );
define( 'MODAFIE_URI', get_template_directory_uri() );

require MODAFIE_DIR . '/inc/setup.php';
require MODAFIE_DIR . '/inc/template-tags.php';
require MODAFIE_DIR . '/inc/class-modafie-walker-nav.php';
require MODAFIE_DIR . '/inc/enqueue.php';
require MODAFIE_DIR . '/inc/customizer.php';
require MODAFIE_DIR . '/inc/forms.php';
require MODAFIE_DIR . '/inc/elementor.php';

if ( class_exists( 'WooCommerce' ) ) {
	require MODAFIE_DIR . '/inc/woocommerce.php';
}

if ( is_admin() || ( defined( 'WP_CLI' ) && WP_CLI ) ) {
	require MODAFIE_DIR . '/inc/importer/class-modafie-importer.php';
	require MODAFIE_DIR . '/inc/importer/admin.php';
}
