<?php
/**
 * Main template (blog index and fallback).
 *
 * @package Modafie
 */

get_header();
?>
<main id="primary" class="mf-main mf-container mf-section">
	<?php if ( is_home() && ! is_front_page() ) : ?>
		<header class="mf-page-header">
			<h1 class="mf-page-title"><?php single_post_title(); ?></h1>
		</header>
	<?php endif; ?>

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
