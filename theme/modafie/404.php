<?php
/**
 * 404 page.
 *
 * @package Modafie
 */

get_header();
?>
<main id="primary" class="mf-main mf-container mf-section mf-404">
	<p class="mf-eyebrow"><?php esc_html_e( 'Error 404', 'modafie' ); ?></p>
	<h1 class="mf-display"><?php esc_html_e( 'Page not found', 'modafie' ); ?></h1>
	<p><?php esc_html_e( 'The page you are looking for has moved or no longer exists.', 'modafie' ); ?></p>
	<?php get_search_form(); ?>
	<p><a class="mf-button" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Back to home', 'modafie' ); ?></a></p>
</main>
<?php
get_footer();
