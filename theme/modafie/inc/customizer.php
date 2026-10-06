<?php
/**
 * Customizer: announcement bar, header behaviour, header/footer template overrides.
 *
 * Colours and fonts are deliberately NOT here. They live in Elementor → Site Settings
 * (Global Colors / Global Fonts) so there is one source of truth.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Elementor library templates for the header/footer selectors.
 *
 * @return array<int|string, string>
 */
function modafie_elementor_template_choices() {
	$choices = array( 0 => esc_html__( '— Theme default —', 'modafie' ) );
	$posts   = get_posts(
		array(
			'post_type'      => 'elementor_library',
			'post_status'    => 'publish',
			'posts_per_page' => 100,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'no_found_rows'  => true,
		)
	);
	foreach ( $posts as $post ) {
		$choices[ $post->ID ] = $post->post_title;
	}
	return $choices;
}

/**
 * Sanitize a checkbox.
 *
 * @param mixed $value Value.
 * @return bool
 */
function modafie_sanitize_checkbox( $value ) {
	return (bool) $value;
}

/**
 * Sanitize a select against its control's choices.
 *
 * @param string               $value   Value.
 * @param WP_Customize_Setting $setting Setting.
 * @return string
 */
function modafie_sanitize_select( $value, $setting ) {
	$choices = $setting->manager->get_control( $setting->id )->choices;
	return array_key_exists( $value, $choices ) ? $value : $setting->default;
}

/**
 * Register Customizer settings.
 *
 * @param WP_Customize_Manager $wp_customize Manager.
 */
function modafie_customize_register( $wp_customize ) {
	$wp_customize->add_panel(
		'modafie',
		array(
			'title'    => esc_html__( 'Modafie Theme', 'modafie' ),
			'priority' => 30,
		)
	);

	// Announcement bar.
	$wp_customize->add_section(
		'modafie_announcement',
		array(
			'title' => esc_html__( 'Announcement bar', 'modafie' ),
			'panel' => 'modafie',
		)
	);
	$wp_customize->add_setting(
		'modafie_announcement_enabled',
		array(
			'default'           => true,
			'sanitize_callback' => 'modafie_sanitize_checkbox',
		)
	);
	$wp_customize->add_control(
		'modafie_announcement_enabled',
		array(
			'label'   => esc_html__( 'Show announcement bar', 'modafie' ),
			'section' => 'modafie_announcement',
			'type'    => 'checkbox',
		)
	);
	$wp_customize->add_setting(
		'modafie_announcement_items',
		array(
			'default'           => '',
			'sanitize_callback' => 'sanitize_textarea_field',
		)
	);
	$wp_customize->add_control(
		'modafie_announcement_items',
		array(
			'label'       => esc_html__( 'Messages', 'modafie' ),
			'description' => esc_html__( 'One message per line. Optional link: Message | https://example.com', 'modafie' ),
			'section'     => 'modafie_announcement',
			'type'        => 'textarea',
		)
	);
	$wp_customize->add_setting(
		'modafie_announcement_style',
		array(
			'default'           => 'rotate',
			'sanitize_callback' => 'modafie_sanitize_select',
		)
	);
	$wp_customize->add_control(
		'modafie_announcement_style',
		array(
			'label'   => esc_html__( 'Display', 'modafie' ),
			'section' => 'modafie_announcement',
			'type'    => 'select',
			'choices' => array(
				'rotate'  => esc_html__( 'Rotate one message at a time', 'modafie' ),
				'marquee' => esc_html__( 'Scrolling marquee', 'modafie' ),
				'static'  => esc_html__( 'Static (first message)', 'modafie' ),
			),
		)
	);
	$wp_customize->add_setting(
		'modafie_announcement_theme',
		array(
			'default'           => 'dark',
			'sanitize_callback' => 'modafie_sanitize_select',
		)
	);
	$wp_customize->add_control(
		'modafie_announcement_theme',
		array(
			'label'   => esc_html__( 'Colour scheme', 'modafie' ),
			'section' => 'modafie_announcement',
			'type'    => 'select',
			'choices' => array(
				'dark'   => esc_html__( 'Dark (Primary colour)', 'modafie' ),
				'light'  => esc_html__( 'Light (Surface colour)', 'modafie' ),
				'accent' => esc_html__( 'Accent colour', 'modafie' ),
			),
		)
	);

	// Header.
	$wp_customize->add_section(
		'modafie_header',
		array(
			'title' => esc_html__( 'Header', 'modafie' ),
			'panel' => 'modafie',
		)
	);
	$wp_customize->add_setting(
		'modafie_header_behavior',
		array(
			'default'           => 'smart',
			'sanitize_callback' => 'modafie_sanitize_select',
		)
	);
	$wp_customize->add_control(
		'modafie_header_behavior',
		array(
			'label'   => esc_html__( 'Scroll behaviour', 'modafie' ),
			'section' => 'modafie_header',
			'type'    => 'select',
			'choices' => array(
				'smart'  => esc_html__( 'Sticky, hide on scroll down / show on scroll up', 'modafie' ),
				'sticky' => esc_html__( 'Always sticky', 'modafie' ),
				'static' => esc_html__( 'Not sticky', 'modafie' ),
			),
		)
	);
	$wp_customize->add_setting(
		'modafie_header_transparent',
		array(
			'default'           => false,
			'sanitize_callback' => 'modafie_sanitize_checkbox',
		)
	);
	$wp_customize->add_control(
		'modafie_header_transparent',
		array(
			'label'       => esc_html__( 'Transparent header over the homepage hero', 'modafie' ),
			'description' => esc_html__( 'Header turns solid once you scroll.', 'modafie' ),
			'section'     => 'modafie_header',
			'type'        => 'checkbox',
		)
	);
	$wp_customize->add_setting(
		'modafie_header_search',
		array(
			'default'           => true,
			'sanitize_callback' => 'modafie_sanitize_checkbox',
		)
	);
	$wp_customize->add_control(
		'modafie_header_search',
		array(
			'label'   => esc_html__( 'Show search icon', 'modafie' ),
			'section' => 'modafie_header',
			'type'    => 'checkbox',
		)
	);

	$templates = modafie_elementor_template_choices();
	foreach ( array( 'header', 'footer' ) as $part ) {
		$wp_customize->add_setting(
			'modafie_' . $part . '_template',
			array(
				'default'           => 0,
				'sanitize_callback' => 'absint',
			)
		);
		$wp_customize->add_control(
			'modafie_' . $part . '_template',
			array(
				/* translators: %s: header or footer. */
				'label'       => sprintf( esc_html__( 'Elementor %s template', 'modafie' ), $part ),
				'description' => esc_html__( 'Replace the theme markup with a template from Templates → Saved Templates. Edit that template with Elementor to change it.', 'modafie' ),
				'section'     => 'header' === $part ? 'modafie_header' : 'modafie_footer',
				'type'        => 'select',
				'choices'     => $templates,
			)
		);
	}

	// Footer.
	$wp_customize->add_section(
		'modafie_footer',
		array(
			'title' => esc_html__( 'Footer', 'modafie' ),
			'panel' => 'modafie',
		)
	);
	$wp_customize->add_setting(
		'modafie_footer_copyright',
		array(
			'default'           => '',
			'sanitize_callback' => 'wp_kses_post',
		)
	);
	$wp_customize->add_control(
		'modafie_footer_copyright',
		array(
			'label'       => esc_html__( 'Copyright text', 'modafie' ),
			'description' => esc_html__( 'Leave empty for "© Year Site name".', 'modafie' ),
			'section'     => 'modafie_footer',
			'type'        => 'text',
		)
	);
}
add_action( 'customize_register', 'modafie_customize_register' );
