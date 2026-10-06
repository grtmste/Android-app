<?php
/**
 * Post card used in archives.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;
?>
<article id="post-<?php the_ID(); ?>" <?php post_class( 'mf-card mf-zoom' ); ?>>
	<a class="mf-card__media" href="<?php the_permalink(); ?>" tabindex="-1" aria-hidden="true">
		<?php
		if ( has_post_thumbnail() ) {
			the_post_thumbnail( 'modafie-card', array( 'loading' => 'lazy' ) );
		}
		?>
	</a>
	<div class="mf-card__body">
		<?php modafie_posted_on(); ?>
		<?php the_title( '<h2 class="mf-card__title"><a href="' . esc_url( get_permalink() ) . '">', '</a></h2>' ); ?>
		<div class="mf-card__excerpt"><?php the_excerpt(); ?></div>
	</div>
</article>
