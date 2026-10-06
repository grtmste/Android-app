<?php
/**
 * Theme supports, menus, widget areas, image sizes.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register theme supports and menus.
 */
function modafie_setup() {
	load_theme_textdomain( 'modafie', MODAFIE_DIR . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'automatic-feed-links' );
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
			'height'               => 80,
			'width'                => 240,
			'flex-height'          => true,
			'flex-width'           => true,
			'unlink-homepage-logo' => false,
		)
	);

	add_theme_support(
		'custom-background',
		array(
			'default-color' => 'ffffff',
		)
	);

	// Elementor: declare compatibility (full-width + canvas templates, header/footer locations).
	add_theme_support( 'elementor' );

	add_editor_style( 'assets/css/editor.css' );

	register_nav_menus(
		array(
			'primary' => esc_html__( 'Primary (header + mobile menu)', 'modafie' ),
			'utility' => esc_html__( 'Header utility links', 'modafie' ),
			'footer'  => esc_html__( 'Footer columns (top-level items become column titles)', 'modafie' ),
			'legal'   => esc_html__( 'Footer bottom / legal', 'modafie' ),
			'social'  => esc_html__( 'Social links', 'modafie' ),
		)
	);

	add_image_size( 'modafie-card', 800, 1000, true );
	add_image_size( 'modafie-wide', 1920, 1080, false );
}
add_action( 'after_setup_theme', 'modafie_setup' );

/**
 * Content width for embeds.
 */
function modafie_content_width() {
	$GLOBALS['content_width'] = apply_filters( 'modafie_content_width', 1440 );
}
add_action( 'after_setup_theme', 'modafie_content_width', 0 );

/**
 * Widget areas: blog sidebar + four footer columns (used when no Elementor footer is assigned).
 */
function modafie_widgets_init() {
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
	for ( $i = 1; $i <= 4; $i++ ) {
		register_sidebar(
			array(
				/* translators: %d: footer column number. */
				'name'          => sprintf( esc_html__( 'Footer column %d', 'modafie' ), $i ),
				'id'            => 'footer-' . $i,
				'description'   => esc_html__( 'Used by the built-in footer when no Elementor footer template is selected in Customizer → Modafie Header & Footer.', 'modafie' ),
				'before_widget' => '<section id="%1$s" class="widget mf-footer__widget %2$s">',
				'after_widget'  => '</section>',
				'before_title'  => '<h2 class="mf-footer__title">',
				'after_title'   => '</h2>',
			)
		);
	}
}
add_action( 'widgets_init', 'modafie_widgets_init' );

/**
 * Body classes used by CSS/JS.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function modafie_body_classes( $classes ) {
	if ( modafie_is_built_with_elementor() ) {
		$classes[] = 'mf-elementor-page';
	}
	if ( get_theme_mod( 'modafie_header_transparent', false ) && is_front_page() ) {
		$classes[] = 'mf-header-transparent';
	}
	if ( get_theme_mod( 'modafie_announcement_enabled', true ) && '' !== trim( (string) get_theme_mod( 'modafie_announcement_text', modafie_default_announcement() ) ) ) {
		$classes[] = 'mf-has-announcement';
	}
	return $classes;
}
add_filter( 'body_class', 'modafie_body_classes' );

/**
 * Add a pingback url auto-discovery header for single posts, pages, or attachments.
 */
function modafie_pingback_header() {
	if ( is_singular() && pings_open() ) {
		printf( '<link rel="pingback" href="%s">', esc_url( get_bloginfo( 'pingback_url' ) ) );
	}
}
add_action( 'wp_head', 'modafie_pingback_header' );

/**
 * Block styles and patterns for pages built with the block editor instead of Elementor.
 */
function modafie_register_block_extras() {
	register_block_style(
		'core/button',
		array(
			'name'  => 'mf-outline-pill',
			'label' => esc_html__( 'Outline pill', 'modafie' ),
		)
	);
	register_block_style(
		'core/heading',
		array(
			'name'  => 'mf-display',
			'label' => esc_html__( 'Display', 'modafie' ),
		)
	);
	register_block_style(
		'core/paragraph',
		array(
			'name'  => 'mf-eyebrow',
			'label' => esc_html__( 'Eyebrow', 'modafie' ),
		)
	);

	register_block_pattern_category( 'modafie', array( 'label' => esc_html__( 'Modafie', 'modafie' ) ) );
	register_block_pattern(
		'modafie/hero',
		array(
			'title'      => esc_html__( 'Modafie hero', 'modafie' ),
			'categories' => array( 'modafie' ),
			'content'    => '<!-- wp:cover {"dimRatio":40,"minHeight":80,"minHeightUnit":"vh","contentPosition":"bottom left","align":"full"} --><div class="wp-block-cover alignfull has-custom-content-position is-position-bottom-left" style="min-height:80vh"><span aria-hidden="true" class="wp-block-cover__background has-background-dim-40 has-background-dim"></span><div class="wp-block-cover__inner-container"><!-- wp:paragraph {"className":"is-style-mf-eyebrow"} --><p class="is-style-mf-eyebrow">' . esc_html__( 'New season', 'modafie' ) . '</p><!-- /wp:paragraph --><!-- wp:heading {"level":1,"className":"is-style-mf-display"} --><h1 class="wp-block-heading is-style-mf-display">' . esc_html__( 'Your headline here', 'modafie' ) . '</h1><!-- /wp:heading --><!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button">' . esc_html__( 'Shop now', 'modafie' ) . '</a></div><!-- /wp:button --></div><!-- /wp:buttons --></div></div><!-- /wp:cover -->',
		)
	);
	register_block_pattern(
		'modafie/newsletter',
		array(
			'title'      => esc_html__( 'Modafie call to action band', 'modafie' ),
			'categories' => array( 'modafie' ),
			'content'    => '<!-- wp:group {"align":"full","backgroundColor":"primary","textColor":"white","layout":{"type":"constrained"},"style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80"}}}} --><div class="wp-block-group alignfull has-white-color has-primary-background-color has-text-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-bottom:var(--wp--preset--spacing--80)"><!-- wp:heading {"textColor":"white"} --><h2 class="wp-block-heading has-white-color has-text-color">' . esc_html__( 'Join the list', 'modafie' ) . '</h2><!-- /wp:heading --><!-- wp:paragraph --><p>' . esc_html__( 'Early access, launches and stories, straight to your inbox.', 'modafie' ) . '</p><!-- /wp:paragraph --><!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button {"className":"is-style-mf-outline-pill"} --><div class="wp-block-button is-style-mf-outline-pill"><a class="wp-block-button__link wp-element-button">' . esc_html__( 'Sign up', 'modafie' ) . '</a></div><!-- /wp:button --></div><!-- /wp:buttons --></div><!-- /wp:group -->',
		)
	);
}
add_action( 'init', 'modafie_register_block_extras' );
