<?php
/**
 * Template Name: Modafie Full Width (no title)
 * Template Post Type: page, post
 *
 * Edge-to-edge content with the theme header/footer and no page title — ideal for Elementor.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

get_header();
while ( have_posts() ) :
	the_post();
	the_content();
endwhile;
get_footer();
