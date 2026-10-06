<?php
/**
 * Site header.
 *
 * Order of precedence: Elementor Pro / Theme Builder "header" location → Elementor template chosen
 * in Customizer → built-in header (template-parts/header/site-header.php).
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link screen-reader-text" href="#content"><?php esc_html_e( 'Skip to content', 'modafie' ); ?></a>
<?php
if ( ! function_exists( 'elementor_theme_do_location' ) || ! elementor_theme_do_location( 'header' ) ) {
	get_template_part( 'template-parts/header/site-header' );
}
?>
<main id="content" class="mf-main" tabindex="-1">
