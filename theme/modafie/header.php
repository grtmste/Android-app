<?php
/**
 * Site header.
 *
 * @package Modafie
 */

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
<div id="page" class="mf-site">
	<a class="skip-link screen-reader-text" href="#primary"><?php esc_html_e( 'Skip to content', 'modafie' ); ?></a>
	<?php
	if ( ! modafie_do_pro_location( 'header' ) ) {
		get_template_part( 'template-parts/header/announcement' );
		get_template_part( 'template-parts/header/site-header' );
	}
	?>
