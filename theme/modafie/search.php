<?php
/**
 * Search results.
 *
 * @package Modafie
 */

get_header();
?>
<main id="primary" class="mf-main mf-container mf-section">
	<header class="mf-page-header">
		<h1 class="mf-page-title">
			<?php
			/* translators: %s: search query. */
			printf( esc_html__( 'Results for “%s”', 'modafie' ), '<span>' . get_search_query() . '</span>' );
			?>
		</h1>
		<?php get_search_form(); ?>
	</header>
	<?php if ( have_posts() ) : ?>
		<div class="mf-post-grid">
			<?php
			while ( have_posts() ) :
				the_post();
				get_template_part( 'template-parts/content', 'search' );
			endwhile;
			?>
		</div>
		<?php the_posts_pagination( array( 'mid_size' => 1 ) ); ?>
	<?php else : ?>
		<?php get_template_part( 'template-parts/content', 'none' ); ?>
	<?php endif; ?>
</main>
<?php
get_footer();
