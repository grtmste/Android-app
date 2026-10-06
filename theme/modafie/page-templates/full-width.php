<?php
/**
 * Template Name: Modafie Full Width (no title)
 * Template Post Type: page, post
 *
 * Full-bleed content area between the theme header and footer, no page title.
 * Elementor also offers "Elementor Full Width" and "Elementor Canvas" templates.
 *
 * @package Modafie
 */

get_header();
?>
<main id="primary" class="mf-main mf-main--full">
	<?php
	while ( have_posts() ) :
		the_post();
		the_content();
	endwhile;
	?>
</main>
<?php
get_footer();
