<?php
/**
 * Page content.
 *
 * @package Modafie
 */

$modafie_is_elementor = did_action( 'elementor/loaded' ) && \Elementor\Plugin::instance()->documents->get( get_the_ID() ) && \Elementor\Plugin::instance()->documents->get( get_the_ID() )->is_built_with_elementor();
?>
<article id="post-<?php the_ID(); ?>" <?php post_class( $modafie_is_elementor ? 'mf-page mf-page--elementor' : 'mf-page mf-section' ); ?>>
	<?php if ( modafie_show_page_title() ) : ?>
		<header class="mf-page-header mf-container mf-prose">
			<?php the_title( '<h1 class="mf-page-title">', '</h1>' ); ?>
		</header>
	<?php endif; ?>
	<div class="entry-content<?php echo $modafie_is_elementor ? '' : ' mf-container mf-prose'; ?>">
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
</article>
