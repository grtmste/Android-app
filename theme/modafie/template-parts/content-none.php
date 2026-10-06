<?php
/**
 * Nothing found.
 *
 * @package Modafie
 */

?>
<section class="mf-no-results mf-prose">
	<h2><?php esc_html_e( 'Nothing found', 'modafie' ); ?></h2>
	<?php if ( is_search() ) : ?>
		<p><?php esc_html_e( 'No results matched your search. Try different keywords.', 'modafie' ); ?></p>
		<?php get_search_form(); ?>
	<?php else : ?>
		<p><?php esc_html_e( 'There is nothing here yet.', 'modafie' ); ?></p>
	<?php endif; ?>
</section>
