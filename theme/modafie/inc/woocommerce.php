<?php
/**
 * WooCommerce support (loaded only when WooCommerce is active).
 * Product grid: 4/2 columns, 4:5 image ratio on grey, second image on hover, bold caps titles.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Theme supports.
 */
function modafie_woocommerce_setup() {
	add_theme_support(
		'woocommerce',
		array(
			'thumbnail_image_width' => 600,
			'single_image_width'    => 1000,
			'product_grid'          => array(
				'default_rows'    => 3,
				'default_columns' => 4,
				'max_columns'     => 6,
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
	wp_enqueue_style( 'modafie-woocommerce', MODAFIE_URI . '/assets/css/woocommerce.css', array( 'modafie' ), MODAFIE_VERSION );
}
add_action( 'wp_enqueue_scripts', 'modafie_woocommerce_assets', 20 );

add_filter( 'loop_shop_columns', static fn() => 4 );
add_filter( 'woocommerce_output_related_products_args', static fn( $args ) => array_merge( $args, array( 'posts_per_page' => 4, 'columns' => 4 ) ) );
remove_action( 'woocommerce_sidebar', 'woocommerce_get_sidebar', 10 );

/**
 * Wrap shop pages in the theme container.
 */
remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );
add_action( 'woocommerce_before_main_content', static function () {
	echo '<div class="mf-container mf-shop">';
}, 10 );
add_action( 'woocommerce_after_main_content', static function () {
	echo '</div>';
}, 10 );

/**
 * Second gallery image for the hover swap on product cards.
 */
function modafie_wc_hover_image() {
	global $product;
	if ( ! $product ) {
		return;
	}
	$ids = $product->get_gallery_image_ids();
	if ( $ids ) {
		echo wp_get_attachment_image( $ids[0], 'woocommerce_thumbnail', false, array( 'class' => 'mf-product-hover', 'loading' => 'lazy', 'alt' => '' ) );
	}
}
add_action( 'woocommerce_before_shop_loop_item_title', 'modafie_wc_hover_image', 11 );

/**
 * Keep the header bag count fresh.
 *
 * @param array $fragments Fragments.
 */
function modafie_wc_cart_fragment( $fragments ) {
	$fragments['.mf-header__count'] = '<span class="mf-header__count">' . esc_html( WC()->cart->get_cart_contents_count() ) . '</span>';
	return $fragments;
}
add_filter( 'woocommerce_add_to_cart_fragments', 'modafie_wc_cart_fragment' );
