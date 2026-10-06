<?php
/**
 * Single post.
 *
 * @package Modafie
 */

get_header();
?>
<main id="primary" class="mf-main mf-section">
	<?php
	while ( have_posts() ) :
		the_post();
		?>
		<article id="post-<?php the_ID(); ?>" <?php post_class( 'mf-single' ); ?>>
			<header class="mf-single__header mf-container mf-prose">
				<?php the_category( ', ' ); ?>
				<?php the_title( '<h1 class="mf-page-title">', '</h1>' ); ?>
				<div class="mf-meta"><?php modafie_posted_on(); ?></div>
			</header>
			<?php if ( has_post_thumbnail() ) : ?>
				<figure class="mf-single__media mf-container">
					<?php the_post_thumbnail( 'modafie-hero', array( 'loading' => 'eager', 'fetchpriority' => 'high' ) ); ?>
				</figure>
			<?php endif; ?>
			<div class="mf-single__content mf-container mf-prose entry-content">
				<?php
				the_content();
				wp_link_pages(
					array(
						'before' => '<nav class="page-links">' . esc_html__( 'Pages:', 'modafie' ),
						'after'  => '</nav>',
					)
				);
				?>
			</div>
			<footer class="mf-single__footer mf-container mf-prose">
				<?php the_tags( '<div class="mf-tags">', ' ', '</div>' ); ?>
				<?php
				the_post_navigation(
					array(
						'prev_text' => '<span class="mf-eyebrow">' . esc_html__( 'Previous', 'modafie' ) . '</span> %title',
						'next_text' => '<span class="mf-eyebrow">' . esc_html__( 'Next', 'modafie' ) . '</span> %title',
					)
				);
				if ( comments_open() || get_comments_number() ) {
					comments_template();
				}
				?>
			</footer>
		</article>
	<?php endwhile; ?>
</main>
<?php
get_sidebar();
get_footer();
