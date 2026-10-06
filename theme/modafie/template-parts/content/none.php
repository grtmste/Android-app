<?php
/**
 * No results.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;
?>
<section class="mf-none">
	<h2><?php esc_html_e( 'Nothing found', 'modafie' ); ?></h2>
	<p><?php esc_html_e( 'Try a different search.', 'modafie' ); ?></p>
	<?php get_search_form(); ?>
</section>
