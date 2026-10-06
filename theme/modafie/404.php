<?php
/**
 * 404.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<section class="mf-container mf-404">
	<p class="mf-eyebrow"><?php esc_html_e( 'Error 404', 'modafie' ); ?></p>
	<h1 class="mf-page-title"><?php esc_html_e( 'Page not found', 'modafie' ); ?></h1>
	<p><?php esc_html_e( 'The page you were looking for has moved or no longer exists.', 'modafie' ); ?></p>
	<?php get_search_form(); ?>
	<p><a class="mf-btn" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Back to home', 'modafie' ); ?></a></p>
</section>
<?php
get_footer();
