<?php
/**
 * Single post.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();
	if ( modafie_is_built_with_elementor() ) :
		the_content();
	else :
		?>
		<article id="post-<?php the_ID(); ?>" <?php post_class( 'mf-container mf-entry mf-entry--post' ); ?>>
			<header class="mf-page-header">
				<?php modafie_posted_on(); ?>
				<?php the_title( '<h1 class="mf-page-title">', '</h1>' ); ?>
			</header>
			<?php if ( has_post_thumbnail() ) : ?>
				<figure class="mf-entry__media"><?php the_post_thumbnail( 'modafie-wide' ); ?></figure>
			<?php endif; ?>
			<div class="mf-entry__content">
				<?php
				the_content();
				wp_link_pages(
					array(
						'before' => '<nav class="page-links" aria-label="' . esc_attr__( 'Page', 'modafie' ) . '">',
						'after'  => '</nav>',
					)
				);
				?>
			</div>
			<footer class="mf-entry__footer">
				<?php the_tags( '<p class="mf-tags">', ' ', '</p>' ); ?>
				<?php
				the_post_navigation(
					array(
						'prev_text' => '<span class="mf-eyebrow">' . esc_html__( 'Previous', 'modafie' ) . '</span> %title',
						'next_text' => '<span class="mf-eyebrow">' . esc_html__( 'Next', 'modafie' ) . '</span> %title',
					)
				);
				?>
			</footer>
		</article>
		<?php
		if ( comments_open() || get_comments_number() ) {
			comments_template();
		}
	endif;
endwhile;

get_footer();
