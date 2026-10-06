<?php
/**
 * Elementor widget: form (newsletter / contact). A free-Elementor alternative to Pro's Form widget.
 * Submissions are stored under Appearance → Form submissions and e-mailed (see inc/forms.php).
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Elementor\Repeater;
use Elementor\Widget_Base;

/**
 * Form widget.
 */
class Modafie_Form_Widget extends Widget_Base {

	/** Name. */
	public function get_name() {
		return 'mf-form';
	}

	/** Title. */
	public function get_title() {
		return esc_html__( 'Modafie Form', 'modafie' );
	}

	/** Icon. */
	public function get_icon() {
		return 'eicon-form-horizontal';
	}

	/** Categories. */
	public function get_categories() {
		return array( 'modafie' );
	}

	/** Keywords. */
	public function get_keywords() {
		return array( 'form', 'contact', 'newsletter', 'subscribe', 'email', 'modafie' );
	}

	/** Lighter DOM. */
	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	/** Controls. */
	protected function register_controls() {
		$this->start_controls_section( 'section_fields', array( 'label' => esc_html__( 'Form fields', 'modafie' ) ) );

		$this->add_control(
			'form_name',
			array(
				'label'   => esc_html__( 'Form name', 'modafie' ),
				'type'    => Controls_Manager::TEXT,
				'default' => esc_html__( 'Contact', 'modafie' ),
			)
		);
		$this->add_control(
			'layout',
			array(
				'label'   => esc_html__( 'Layout', 'modafie' ),
				'type'    => Controls_Manager::SELECT,
				'options' => array(
					'stacked' => esc_html__( 'Stacked', 'modafie' ),
					'inline'  => esc_html__( 'Inline (newsletter)', 'modafie' ),
				),
				'default' => 'stacked',
			)
		);

		$repeater = new Repeater();
		$repeater->add_control(
			'field_type',
			array(
				'label'   => esc_html__( 'Type', 'modafie' ),
				'type'    => Controls_Manager::SELECT,
				'options' => array(
					'text'     => esc_html__( 'Text', 'modafie' ),
					'email'    => esc_html__( 'Email', 'modafie' ),
					'tel'      => esc_html__( 'Phone', 'modafie' ),
					'textarea' => esc_html__( 'Textarea', 'modafie' ),
					'select'   => esc_html__( 'Select', 'modafie' ),
					'checkbox' => esc_html__( 'Checkbox (consent)', 'modafie' ),
				),
				'default' => 'text',
			)
		);
		$repeater->add_control(
			'field_label',
			array(
				'label'   => esc_html__( 'Label', 'modafie' ),
				'type'    => Controls_Manager::TEXT,
				'default' => esc_html__( 'Name', 'modafie' ),
			)
		);
		$repeater->add_control(
			'field_name',
			array(
				'label'       => esc_html__( 'Field key', 'modafie' ),
				'type'        => Controls_Manager::TEXT,
				'description' => esc_html__( 'Letters, numbers and dashes. Used in the stored submission.', 'modafie' ),
			)
		);
		$repeater->add_control(
			'placeholder',
			array(
				'label'     => esc_html__( 'Placeholder', 'modafie' ),
				'type'      => Controls_Manager::TEXT,
				'condition' => array( 'field_type!' => array( 'select', 'checkbox' ) ),
			)
		);
		$repeater->add_control(
			'field_options',
			array(
				'label'       => esc_html__( 'Options (one per line)', 'modafie' ),
				'type'        => Controls_Manager::TEXTAREA,
				'condition'   => array( 'field_type' => 'select' ),
			)
		);
		$repeater->add_control(
			'required',
			array(
				'label'        => esc_html__( 'Required', 'modafie' ),
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
			)
		);
		$repeater->add_responsive_control(
			'width',
			array(
				'label'   => esc_html__( 'Column width', 'modafie' ),
				'type'    => Controls_Manager::SELECT,
				'options' => array(
					'100' => '100%',
					'50'  => '50%',
				),
				'default' => '100',
			)
		);
		$this->add_control(
			'fields',
			array(
				'type'        => Controls_Manager::REPEATER,
				'fields'      => $repeater->get_controls(),
				'default'     => array(
					array(
						'field_type'  => 'text',
						'field_label' => esc_html__( 'Name', 'modafie' ),
						'field_name'  => 'name',
						'placeholder' => esc_html__( 'Name', 'modafie' ),
						'required'    => 'yes',
					),
					array(
						'field_type'  => 'email',
						'field_label' => esc_html__( 'Email', 'modafie' ),
						'field_name'  => 'email',
						'placeholder' => esc_html__( 'Email', 'modafie' ),
						'required'    => 'yes',
					),
					array(
						'field_type'  => 'textarea',
						'field_label' => esc_html__( 'Message', 'modafie' ),
						'field_name'  => 'message',
						'placeholder' => esc_html__( 'Message', 'modafie' ),
						'required'    => 'yes',
					),
				),
				'title_field' => '{{{ field_label }}}',
			)
		);
		$this->add_control(
			'show_labels',
			array(
				'label'        => esc_html__( 'Show labels', 'modafie' ),
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default'      => 'yes',
			)
		);
		$this->add_control(
			'submit_text',
			array(
				'label'     => esc_html__( 'Button text', 'modafie' ),
				'type'      => Controls_Manager::TEXT,
				'default'   => esc_html__( 'Send', 'modafie' ),
				'separator' => 'before',
			)
		);
		$this->end_controls_section();

		$this->start_controls_section( 'section_actions', array( 'label' => esc_html__( 'After submit', 'modafie' ) ) );
		$this->add_control(
			'success_message',
			array(
				'label'   => esc_html__( 'Success message', 'modafie' ),
				'type'    => Controls_Manager::TEXTAREA,
				'default' => esc_html__( 'Thanks — we’ll be in touch soon.', 'modafie' ),
			)
		);
		$this->add_control(
			'email_to',
			array(
				'label'       => esc_html__( 'Send to e-mail', 'modafie' ),
				'type'        => Controls_Manager::TEXT,
				'placeholder' => get_option( 'admin_email' ),
				'description' => esc_html__( 'Leave empty to use the site admin e-mail. Every submission is also stored under Appearance → Form submissions.', 'modafie' ),
			)
		);
		$this->add_control(
			'redirect_to',
			array(
				'label' => esc_html__( 'Redirect after submit (optional)', 'modafie' ),
				'type'  => Controls_Manager::URL,
			)
		);
		$this->end_controls_section();

		$this->start_controls_section(
			'section_style',
			array(
				'label' => esc_html__( 'Fields', 'modafie' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			)
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			array(
				'name'     => 'field_typography',
				'selector' => '{{WRAPPER}} .mf-input',
			)
		);
		$this->add_control(
			'field_bg',
			array(
				'label'     => esc_html__( 'Field background', 'modafie' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array( '{{WRAPPER}} .mf-input' => 'background-color: {{VALUE}};' ),
			)
		);
		$this->add_control(
			'field_border',
			array(
				'label'     => esc_html__( 'Field border colour', 'modafie' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array( '{{WRAPPER}} .mf-input' => 'border-color: {{VALUE}};' ),
			)
		);
		$this->add_control(
			'label_color',
			array(
				'label'     => esc_html__( 'Label colour', 'modafie' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array( '{{WRAPPER}} .mf-form__label' => 'color: {{VALUE}};' ),
			)
		);
		$this->add_responsive_control(
			'row_gap',
			array(
				'label'      => esc_html__( 'Gap', 'modafie' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'selectors'  => array( '{{WRAPPER}} .mf-form' => '--mf-form-gap: {{SIZE}}{{UNIT}};' ),
			)
		);
		$this->end_controls_section();
	}

	/** Render. */
	protected function render() {
		$s        = $this->get_settings_for_display();
		$fields   = is_array( $s['fields'] ) ? $s['fields'] : array();
		$post_id  = get_the_ID();
		$doc      = \Elementor\Plugin::$instance->documents->get_current();
		$owner_id = $doc ? $doc->get_main_id() : $post_id;
		$labels   = 'yes' === $s['show_labels'];
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- display only (no-JS fallback after redirect).
		$status = isset( $_GET['mf_form'], $_GET['mf_fid'] ) && $this->get_id() === sanitize_key( wp_unslash( $_GET['mf_fid'] ) ) ? sanitize_key( wp_unslash( $_GET['mf_form'] ) ) : '';
		// phpcs:enable

		printf(
			'<form class="mf-form mf-form--%1$s" method="post" action="%2$s" data-mf-form novalidate>',
			esc_attr( $s['layout'] ),
			esc_url( admin_url( 'admin-post.php' ) )
		);
		echo '<input type="hidden" name="action" value="modafie_form">';
		printf( '<input type="hidden" name="mf_post" value="%d">', absint( $owner_id ) );
		printf( '<input type="hidden" name="mf_form_id" value="%s">', esc_attr( $this->get_id() ) );
		printf( '<input type="hidden" name="mf_ts" value="%d">', time() );
		echo '<div class="mf-form__hp" aria-hidden="true"><label>Leave empty<input type="text" name="mf_hp" tabindex="-1" autocomplete="off"></label></div>';
		echo '<div class="mf-form__fields">';

		foreach ( $fields as $i => $f ) {
			$type     = in_array( $f['field_type'], array( 'text', 'email', 'tel', 'textarea', 'select', 'checkbox' ), true ) ? $f['field_type'] : 'text';
			$key      = modafie_form_field_key( $f, $i );
			$id       = 'mf-' . $this->get_id() . '-' . $key;
			$required = 'yes' === ( $f['required'] ?? '' );
			$req_attr = $required ? ' required aria-required="true"' : '';
			$width    = ! empty( $f['width'] ) ? $f['width'] : '100';
			$label    = esc_html( $f['field_label'] ) . ( $required ? '<span class="mf-form__req" aria-hidden="true">*</span>' : '' );

			printf( '<div class="mf-form__field mf-form__field--%1$s mf-form__field--w%2$s">', esc_attr( $type ), esc_attr( $width ) );
			if ( 'checkbox' === $type ) {
				printf(
					'<label class="mf-form__check" for="%1$s"><input type="checkbox" id="%1$s" name="mf_fields[%2$s]" value="1"%3$s> <span>%4$s</span></label>',
					esc_attr( $id ),
					esc_attr( $key ),
					$req_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static.
					wp_kses_post( $label )
				);
			} else {
				printf(
					'<label class="mf-form__label%1$s" for="%2$s">%3$s</label>',
					$labels ? '' : ' screen-reader-text',
					esc_attr( $id ),
					wp_kses_post( $label )
				);
				$placeholder = isset( $f['placeholder'] ) ? $f['placeholder'] : '';
				if ( 'textarea' === $type ) {
					printf( '<textarea class="mf-input" id="%1$s" name="mf_fields[%2$s]" rows="5" placeholder="%3$s"%4$s></textarea>', esc_attr( $id ), esc_attr( $key ), esc_attr( $placeholder ), $req_attr ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				} elseif ( 'select' === $type ) {
					printf( '<select class="mf-input" id="%1$s" name="mf_fields[%2$s]"%3$s>', esc_attr( $id ), esc_attr( $key ), $req_attr ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					foreach ( array_filter( array_map( 'trim', preg_split( '/\r\n|\r|\n/', (string) ( $f['field_options'] ?? '' ) ) ) ) as $opt ) {
						printf( '<option value="%1$s">%1$s</option>', esc_attr( $opt ) );
					}
					echo '</select>';
				} else {
					$auto = 'email' === $type ? 'email' : ( 'tel' === $type ? 'tel' : ( 'name' === $key ? 'name' : 'on' ) );
					printf( '<input class="mf-input" type="%1$s" id="%2$s" name="mf_fields[%3$s]" placeholder="%4$s" autocomplete="%5$s"%6$s>', esc_attr( $type ), esc_attr( $id ), esc_attr( $key ), esc_attr( $placeholder ), esc_attr( $auto ), $req_attr ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				}
			}
			echo '</div>';
		}

		printf(
			'<div class="mf-form__submit"><button type="submit" class="elementor-button mf-btn"><span class="elementor-button-text">%s</span></button></div>',
			esc_html( $s['submit_text'] )
		);
		echo '</div>';
		printf(
			'<div class="mf-form__status" role="status" aria-live="polite" data-success="%1$s">%2$s</div>',
			esc_attr( $s['success_message'] ),
			'sent' === $status ? esc_html( $s['success_message'] ) : ''
		);
		echo '</form>';
	}
}
