<?php
/**
 * WooCommerce compatibility (loaded only when WooCommerce is active).
 *
 * Gymshark-style product grid: 4 columns on desktop, 2 on mobile, image-first cards
 * on a surface background, no sidebar.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Declare WooCommerce support.
 */
function modafie_woocommerce_setup() {
	add_theme_support(
		'woocommerce',
		array(
			'thumbnail_image_width' => 800,
			'single_image_width'    => 1200,
			'product_grid'          => array(
				'default_rows'    => 4,
				'min_rows'        => 1,
				'default_columns' => 4,
				'min_columns'     => 2,
				'max_columns'     => 5,
			),
		)
	);
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );
}
add_action( 'after_setup_theme', 'modafie_woocommerce_setup' );

/**
 * Styles.
 */
function modafie_woocommerce_assets() {
	wp_enqueue_style( 'modafie-woocommerce', MODAFIE_URI . '/assets/css/woocommerce.css', array( 'modafie-theme' ), MODAFIE_VERSION );
}
add_action( 'wp_enqueue_scripts', 'modafie_woocommerce_assets' );

// Full-width shop: no sidebar.
remove_action( 'woocommerce_sidebar', 'woocommerce_get_sidebar', 10 );

/**
 * Wrap Woo content in the theme container.
 */
function modafie_woocommerce_wrapper_before() {
	echo '<main id="primary" class="mf-main mf-container mf-shop">';
}
/**
 * Close the wrapper.
 */
function modafie_woocommerce_wrapper_after() {
	echo '</main>';
}
remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );
add_action( 'woocommerce_before_main_content', 'modafie_woocommerce_wrapper_before' );
add_action( 'woocommerce_after_main_content', 'modafie_woocommerce_wrapper_after' );

/**
 * Header cart link with live count.
 *
 * @param array $fragments Fragments.
 * @return array
 */
function modafie_cart_fragment( $fragments ) {
	$fragments['.mf-cart-count'] = '<span class="mf-cart-count">' . esc_html( (string) WC()->cart->get_cart_contents_count() ) . '</span>';
	return $fragments;
}
add_filter( 'woocommerce_add_to_cart_fragments', 'modafie_cart_fragment' );
