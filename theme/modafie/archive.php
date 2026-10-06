<?php
/**
 * Archive template.
 *
 * @package Modafie
 */

get_header();
?>
<main id="primary" class="mf-main mf-container mf-section">
	<header class="mf-page-header">
		<?php the_archive_title( '<h1 class="mf-page-title">', '</h1>' ); ?>
		<?php the_archive_description( '<div class="mf-archive-description">', '</div>' ); ?>
	</header>
	<?php if ( have_posts() ) : ?>
		<div class="mf-post-grid">
			<?php
			while ( have_posts() ) :
				the_post();
				get_template_part( 'template-parts/content', get_post_type() );
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
