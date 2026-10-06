<?php
/**
 * Elementor integration (works with the free plugin; Pro is optional).
 *
 * - Header/footer theme locations (Elementor Pro Theme Builder / compatible plugins can override them).
 * - "Modafie" font group: Inter + Barlow Condensed are self-hosted, so Elementor never loads Google Fonts for them.
 * - "Modafie" widget category with the Marquee and Form widgets.
 * - "Modafie Motion" control in every widget's / container's Advanced tab that adds the mf-* animation classes.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

if ( ! did_action( 'elementor/loaded' ) ) {
	add_action( 'elementor/loaded', 'modafie_elementor_boot' );
} else {
	modafie_elementor_boot();
}

/**
 * Hook everything once Elementor is loaded.
 */
function modafie_elementor_boot() {
	add_action( 'elementor/theme/register_locations', 'modafie_elementor_locations' );
	add_filter( 'elementor/fonts/groups', 'modafie_elementor_font_groups' );
	add_filter( 'elementor/fonts/additional_fonts', 'modafie_elementor_fonts' );
	add_action( 'elementor/elements/categories_registered', 'modafie_elementor_category' );
	add_action( 'elementor/widgets/register', 'modafie_elementor_widgets' );
	add_action( 'elementor/element/after_section_end', 'modafie_elementor_motion_controls', 10, 3 );
	add_action( 'elementor/editor/after_enqueue_styles', 'modafie_elementor_editor_styles' );
	add_action( 'elementor/preview/enqueue_styles', 'modafie_elementor_preview_styles' );
}

/**
 * Register header/footer locations so Elementor Pro (or compatible plugins) can take over.
 *
 * @param \ElementorPro\Modules\ThemeBuilder\Classes\Locations_Manager $manager Manager.
 */
function modafie_elementor_locations( $manager ) {
	$manager->register_all_core_location();
}

/**
 * Font group.
 *
 * @param array $groups Groups.
 */
function modafie_elementor_font_groups( $groups ) {
	return array( 'modafie' => esc_html__( 'Modafie (self-hosted)', 'modafie' ) ) + $groups;
}

/**
 * Map the bundled families to the Modafie group (overrides Elementor's Google mapping).
 *
 * @param array $fonts Fonts.
 */
function modafie_elementor_fonts( $fonts ) {
	$fonts['Barlow Condensed'] = 'modafie';
	$fonts['Inter']            = 'modafie';
	return $fonts;
}

/**
 * Widget category.
 *
 * @param \Elementor\Elements_Manager $elements_manager Manager.
 */
function modafie_elementor_category( $elements_manager ) {
	$elements_manager->add_category(
		'modafie',
		array(
			'title' => esc_html__( 'Modafie', 'modafie' ),
			'icon'  => 'eicon-star',
		)
	);
}

/**
 * Register theme widgets.
 *
 * @param \Elementor\Widgets_Manager $widgets_manager Manager.
 */
function modafie_elementor_widgets( $widgets_manager ) {
	require_once MODAFIE_DIR . '/inc/widgets/class-modafie-marquee-widget.php';
	require_once MODAFIE_DIR . '/inc/widgets/class-modafie-form-widget.php';
	$widgets_manager->register( new Modafie_Marquee_Widget() );
	$widgets_manager->register( new Modafie_Form_Widget() );
}

/**
 * Add the "Modafie Motion" section after Elementor's own Motion Effects section.
 * Each option simply adds an `mf-*` class, identical to typing it under Advanced → CSS Classes.
 *
 * @param \Elementor\Controls_Stack $element    Element.
 * @param string                    $section_id Section ID.
 * @param array                     $args       Args.
 */
function modafie_elementor_motion_controls( $element, $section_id, $args ) {
	if ( 'section_effects' !== $section_id ) {
		return;
	}
	$name = $element->get_name();
	if ( ! in_array( $name, array( 'common', 'common-optimized', 'container', 'section', 'column' ), true ) ) {
		return;
	}
	$is_layout = in_array( $name, array( 'container', 'section', 'column' ), true );

	$element->start_controls_section(
		'mf_motion_section',
		array(
			'label' => esc_html__( 'Modafie Motion', 'modafie' ),
			'tab'   => \Elementor\Controls_Manager::TAB_ADVANCED,
		)
	);

	$options = $is_layout
		? array(
			''            => esc_html__( 'None', 'modafie' ),
			'hero'        => esc_html__( 'Hero: slow zoom background + text reveal', 'modafie' ),
			'parallax-bg' => esc_html__( 'Parallax background image', 'modafie' ),
			'carousel'    => esc_html__( 'Draggable carousel (children become slides)', 'modafie' ),
			'tile'        => esc_html__( 'Category tile (zoom + scrim on hover)', 'modafie' ),
			'stagger'     => esc_html__( 'Stagger children in on scroll', 'modafie' ),
		)
		: array(
			''         => esc_html__( 'None', 'modafie' ),
			'reveal'   => esc_html__( 'Text reveal (line-by-line mask)', 'modafie' ),
			'parallax' => esc_html__( 'Parallax image', 'modafie' ),
			'zoom'     => esc_html__( 'Image hover zoom', 'modafie' ),
			'marquee'  => esc_html__( 'Infinite marquee (text)', 'modafie' ),
		);

	$element->add_control(
		'mf_motion',
		array(
			'label'        => esc_html__( 'Effect', 'modafie' ),
			'type'         => \Elementor\Controls_Manager::SELECT,
			'options'      => $options,
			'default'      => '',
			'prefix_class' => 'mf-',
			'description'  => esc_html__( 'Adds the matching mf-* CSS class. Disabled automatically for visitors who prefer reduced motion.', 'modafie' ),
		)
	);

	$element->add_control(
		'mf_parallax_speed',
		array(
			'label'     => esc_html__( 'Parallax strength', 'modafie' ),
			'type'      => \Elementor\Controls_Manager::SLIDER,
			'range'     => array(
				'px' => array(
					'min'  => 0.05,
					'max'  => 0.5,
					'step' => 0.05,
				),
			),
			'default'   => array(
				'unit' => 'px',
				'size' => 0.2,
			),
			'selectors' => array( '{{WRAPPER}}' => '--mf-parallax: {{SIZE}};' ),
			'condition' => array( 'mf_motion' => array( 'parallax', 'parallax-bg', 'hero' ) ),
		)
	);

	$element->end_controls_section();
}

/**
 * Editor panel styling for the Modafie category.
 */
function modafie_elementor_editor_styles() {
	wp_add_inline_style( 'elementor-editor', '#elementor-panel-category-modafie .elementor-element .icon{color:#0b0b0b}' );
}

/**
 * Make sure the theme fonts are present in the Elementor preview iframe.
 */
function modafie_elementor_preview_styles() {
	wp_enqueue_style( 'modafie-fonts', MODAFIE_URI . '/assets/css/fonts.css', array(), MODAFIE_VERSION );
}
