<?php
/**
 * Customizer: announcement bar, header behaviour, header/footer Elementor templates.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Elementor templates for the header/footer selects.
 *
 * @return array<int|string,string>
 */
function modafie_elementor_template_choices() {
	$choices = array( 0 => esc_html__( '— Built-in theme markup —', 'modafie' ) );
	if ( ! post_type_exists( 'elementor_library' ) ) {
		return $choices;
	}
	$templates = get_posts(
		array(
			'post_type'      => 'elementor_library',
			'post_status'    => 'publish',
			'posts_per_page' => 200,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'no_found_rows'  => true,
		)
	);
	foreach ( $templates as $template ) {
		$choices[ $template->ID ] = $template->post_title;
	}
	return $choices;
}

/**
 * Sanitize a checkbox.
 *
 * @param mixed $value Value.
 */
function modafie_sanitize_checkbox( $value ) {
	return (bool) $value;
}

/**
 * Register Customizer settings.
 *
 * @param WP_Customize_Manager $wp_customize Manager.
 */
function modafie_customize_register( $wp_customize ) {
	$wp_customize->add_section(
		'modafie_header_footer',
		array(
			'title'       => esc_html__( 'Modafie Header & Footer', 'modafie' ),
			'priority'    => 30,
			'description' => esc_html__( 'Colours and fonts are controlled globally in Elementor → Site Settings. To design the header or footer visually, build an Elementor template (Templates → Saved Templates) and select it here.', 'modafie' ),
		)
	);

	$settings = array(
		'modafie_announcement_enabled'  => array( true, 'modafie_sanitize_checkbox', 'checkbox', esc_html__( 'Show announcement bar', 'modafie' ) ),
		'modafie_announcement_text'     => array( modafie_default_announcement(), 'sanitize_textarea_field', 'textarea', esc_html__( 'Announcement messages (one per line, scrolls as a marquee)', 'modafie' ) ),
		'modafie_announcement_link'     => array( '', 'esc_url_raw', 'url', esc_html__( 'Announcement link (optional)', 'modafie' ) ),
		'modafie_header_hide_on_scroll' => array( true, 'modafie_sanitize_checkbox', 'checkbox', esc_html__( 'Hide header when scrolling down, show when scrolling up', 'modafie' ) ),
		'modafie_header_transparent'    => array( false, 'modafie_sanitize_checkbox', 'checkbox', esc_html__( 'Transparent header over the homepage hero', 'modafie' ) ),
		'modafie_header_cta_text'       => array( '', 'sanitize_text_field', 'text', esc_html__( 'Header button text (optional)', 'modafie' ) ),
		'modafie_header_cta_url'        => array( '', 'esc_url_raw', 'url', esc_html__( 'Header button link', 'modafie' ) ),
		'modafie_footer_copyright'      => array( '', 'wp_kses_post', 'textarea', esc_html__( 'Footer copyright line (built-in footer). Use {year} and {site}.', 'modafie' ) ),
	);
	foreach ( $settings as $id => $s ) {
		$wp_customize->add_setting(
			$id,
			array(
				'default'           => $s[0],
				'sanitize_callback' => $s[1],
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			$id,
			array(
				'label'   => $s[3],
				'section' => 'modafie_header_footer',
				'type'    => $s[2],
			)
		);
	}

	foreach ( array(
		'modafie_header_template' => esc_html__( 'Header: Elementor template (replaces the built-in header)', 'modafie' ),
		'modafie_footer_template' => esc_html__( 'Footer: Elementor template (replaces the built-in footer)', 'modafie' ),
	) as $id => $label ) {
		$wp_customize->add_setting(
			$id,
			array(
				'default'           => 0,
				'sanitize_callback' => 'absint',
			)
		);
		$wp_customize->add_control(
			$id,
			array(
				'label'   => $label,
				'section' => 'modafie_header_footer',
				'type'    => 'select',
				'choices' => modafie_elementor_template_choices(),
			)
		);
	}
}
add_action( 'customize_register', 'modafie_customize_register' );
