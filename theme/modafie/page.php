<?php
/**
 * Page template. Elementor pages render full width with no theme title.
 *
 * @package Modafie
 */

get_header();
?>
<main id="primary" class="mf-main">
	<?php
	while ( have_posts() ) :
		the_post();
		get_template_part( 'template-parts/content', 'page' );
		if ( comments_open() || get_comments_number() ) {
			echo '<div class="mf-container mf-prose">';
			comments_template();
			echo '</div>';
		}
	endwhile;
	?>
</main>
<?php
get_footer();
