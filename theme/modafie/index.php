<?php
/**
 * Main template: blog index / archives fallback.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<div class="mf-container mf-archive">
	<header class="mf-page-header">
		<?php if ( is_home() && ! is_front_page() ) : ?>
			<h1 class="mf-page-title"><?php single_post_title(); ?></h1>
		<?php elseif ( is_archive() ) : ?>
			<?php the_archive_title( '<h1 class="mf-page-title">', '</h1>' ); ?>
			<?php the_archive_description( '<div class="mf-archive__desc">', '</div>' ); ?>
		<?php elseif ( is_search() ) : ?>
			<h1 class="mf-page-title">
				<?php
				/* translators: %s: search query. */
				printf( esc_html__( 'Results for “%s”', 'modafie' ), esc_html( get_search_query() ) );
				?>
			</h1>
		<?php else : ?>
			<h1 class="mf-page-title"><?php esc_html_e( 'Latest', 'modafie' ); ?></h1>
		<?php endif; ?>
	</header>

	<?php if ( have_posts() ) : ?>
		<div class="mf-grid">
			<?php
			while ( have_posts() ) :
				the_post();
				get_template_part( 'template-parts/content/card' );
			endwhile;
			?>
		</div>
		<?php
		the_posts_pagination(
			array(
				'prev_text' => modafie_icon( 'prev' ) . '<span class="screen-reader-text">' . esc_html__( 'Previous page', 'modafie' ) . '</span>',
				'next_text' => '<span class="screen-reader-text">' . esc_html__( 'Next page', 'modafie' ) . '</span>' . modafie_icon( 'next' ),
			)
		);
		?>
	<?php else : ?>
		<?php get_template_part( 'template-parts/content/none' ); ?>
	<?php endif; ?>
</div>
<?php
get_footer();
