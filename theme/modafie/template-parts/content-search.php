<?php
/**
 * Search result card.
 *
 * @package Modafie
 */

?>
<article id="post-<?php the_ID(); ?>" <?php post_class( 'mf-card' ); ?>>
	<a class="mf-card__media mf-hover-zoom" href="<?php the_permalink(); ?>" tabindex="-1" aria-hidden="true">
		<?php
		if ( has_post_thumbnail() ) {
			the_post_thumbnail( 'modafie-card' );
		}
		?>
	</a>
	<div class="mf-card__body">
		<div class="mf-meta"><?php modafie_posted_on(); ?></div>
		<?php the_title( '<h2 class="mf-card__title"><a href="' . esc_url( get_permalink() ) . '">', '</a></h2>' ); ?>
		<div class="mf-card__excerpt"><?php the_excerpt(); ?></div>
	</div>
</article>
