<?php
/**
 * Theme setup: supports, menus, widget areas.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register theme supports, menus and image sizes.
 */
function modafie_setup() {
	load_theme_textdomain( 'modafie', MODAFIE_DIR . '/languages' );

	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'editor-styles' );
	add_theme_support( 'customize-selective-refresh-widgets' );
	add_theme_support(
		'html5',
		array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' )
	);
	add_theme_support(
		'custom-logo',
		array(
			'height'      => 64,
			'width'       => 240,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);

	// Elementor: the theme relies on Elementor for page layouts but works without it.
	add_theme_support( 'elementor' );
	add_theme_support( 'header-footer-elementor' );

	add_theme_support(
		'custom-background',
		array(
			'default-color' => 'ffffff',
		)
	);

	add_editor_style( 'assets/css/editor-style.css' );

	add_image_size( 'modafie-card', 800, 1000, true );
	add_image_size( 'modafie-hero', 2400, 1350, false );

	register_nav_menus(
		array(
			'primary' => esc_html__( 'Primary (header)', 'modafie' ),
			'utility' => esc_html__( 'Utility (header, right)', 'modafie' ),
			'mobile'  => esc_html__( 'Mobile (off-canvas, falls back to Primary)', 'modafie' ),
			'footer'  => esc_html__( 'Footer legal links', 'modafie' ),
			'social'  => esc_html__( 'Social links', 'modafie' ),
		)
	);
}
add_action( 'after_setup_theme', 'modafie_setup' );

/**
 * Flag the one-click import notice on theme activation (also when activated via WP-CLI).
 */
function modafie_after_switch_theme() {
	if ( ! get_option( 'modafie_demo_imported' ) ) {
		update_option( 'modafie_show_setup_notice', 1, false );
	}
}
add_action( 'after_switch_theme', 'modafie_after_switch_theme' );

/**
 * Content width (used by oEmbeds).
 */
function modafie_content_width() {
	$GLOBALS['content_width'] = apply_filters( 'modafie_content_width', 1200 );
}
add_action( 'after_setup_theme', 'modafie_content_width', 0 );

/**
 * Widget areas: four footer columns and a blog sidebar.
 */
function modafie_widgets_init() {
	for ( $i = 1; $i <= 4; $i++ ) {
		register_sidebar(
			array(
				/* translators: %d: footer column number. */
				'name'          => sprintf( esc_html__( 'Footer column %d', 'modafie' ), $i ),
				'id'            => 'footer-' . $i,
				'description'   => esc_html__( 'Shown in the theme footer when no Elementor footer template is selected.', 'modafie' ),
				'before_widget' => '<section id="%1$s" class="widget %2$s">',
				'after_widget'  => '</section>',
				'before_title'  => '<h2 class="widget-title">',
				'after_title'   => '</h2>',
			)
		);
	}
	register_sidebar(
		array(
			'name'          => esc_html__( 'Blog sidebar', 'modafie' ),
			'id'            => 'sidebar-1',
			'description'   => esc_html__( 'Shown on posts and archives.', 'modafie' ),
			'before_widget' => '<section id="%1$s" class="widget %2$s">',
			'after_widget'  => '</section>',
			'before_title'  => '<h2 class="widget-title">',
			'after_title'   => '</h2>',
		)
	);
}
add_action( 'widgets_init', 'modafie_widgets_init' );

/**
 * Body classes for header behaviour and template state.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function modafie_body_classes( $classes ) {
	if ( get_theme_mod( 'modafie_header_transparent', false ) && is_front_page() ) {
		$classes[] = 'mf-has-transparent-header';
	}
	if ( ! is_singular() ) {
		$classes[] = 'mf-archive';
	}
	return $classes;
}
add_filter( 'body_class', 'modafie_body_classes' );

/**
 * Add a pingback url auto-discovery header for single posts.
 */
function modafie_pingback_header() {
	if ( is_singular() && pings_open() ) {
		printf( '<link rel="pingback" href="%s">', esc_url( get_bloginfo( 'pingback_url' ) ) );
	}
}
add_action( 'wp_head', 'modafie_pingback_header' );

/**
 * Meta description + Open Graph basics for imported pages (skipped when an SEO plugin is active).
 */
function modafie_meta_tags() {
	if ( ! is_singular() || defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || class_exists( 'All_in_One_SEO_Pack' ) || defined( 'SEOPRESS_VERSION' ) ) {
		return;
	}
	$description = get_post_meta( get_queried_object_id(), '_modafie_meta_description', true );
	if ( ! $description ) {
		return;
	}
	printf( '<meta name="description" content="%s">' . "\n", esc_attr( $description ) );
	printf( '<meta property="og:title" content="%s">' . "\n", esc_attr( wp_get_document_title() ) );
	printf( '<meta property="og:description" content="%s">' . "\n", esc_attr( $description ) );
	printf( '<meta property="og:url" content="%s">' . "\n", esc_url( get_permalink() ) );
	if ( has_post_thumbnail() ) {
		printf( '<meta property="og:image" content="%s">' . "\n", esc_url( get_the_post_thumbnail_url( null, 'large' ) ) );
	}
}
add_action( 'wp_head', 'modafie_meta_tags', 2 );

/**
 * Block styles that match the design system (for posts edited in the block editor).
 */
function modafie_block_styles() {
	register_block_style(
		'core/button',
		array(
			'name'         => 'modafie-outline',
			'label'        => __( 'Outline pill', 'modafie' ),
			'inline_style' => '.wp-block-button.is-style-modafie-outline .wp-block-button__link{background:transparent;color:var(--wp--preset--color--primary);box-shadow:inset 0 0 0 1.5px currentColor}',
		)
	);
	register_block_style(
		'core/heading',
		array(
			'name'         => 'modafie-display',
			'label'        => __( 'Display', 'modafie' ),
			'inline_style' => '.wp-block-heading.is-style-modafie-display{font-size:var(--wp--preset--font-size--display);line-height:.9}',
		)
	);
	register_block_style(
		'core/paragraph',
		array(
			'name'         => 'modafie-eyebrow',
			'label'        => __( 'Eyebrow', 'modafie' ),
			'inline_style' => '.is-style-modafie-eyebrow{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--wp--preset--color--secondary)}',
		)
	);
}
add_action( 'init', 'modafie_block_styles' );

/**
 * A simple block pattern for non-Elementor posts.
 */
function modafie_block_patterns() {
	register_block_pattern(
		'modafie/eyebrow-heading-text',
		array(
			'title'       => __( 'Modafie: eyebrow, heading and text', 'modafie' ),
			'categories'  => array( 'text' ),
			'content'     => '<!-- wp:paragraph {"className":"is-style-modafie-eyebrow"} --><p class="is-style-modafie-eyebrow">' . esc_html__( 'Eyebrow', 'modafie' ) . '</p><!-- /wp:paragraph --><!-- wp:heading --><h2 class="wp-block-heading">' . esc_html__( 'Section heading', 'modafie' ) . '</h2><!-- /wp:heading --><!-- wp:paragraph --><p>' . esc_html__( 'Short supporting text.', 'modafie' ) . '</p><!-- /wp:paragraph -->',
		)
	);
}
add_action( 'init', 'modafie_block_patterns' );
