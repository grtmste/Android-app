<?php
/**
 * Elementor widget: infinite marquee / ticker strip.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Elementor\Repeater;
use Elementor\Widget_Base;

/**
 * Marquee widget.
 */
class Modafie_Marquee_Widget extends Widget_Base {

	/** Name. */
	public function get_name() {
		return 'mf-marquee';
	}

	/** Title. */
	public function get_title() {
		return esc_html__( 'Modafie Marquee', 'modafie' );
	}

	/** Icon. */
	public function get_icon() {
		return 'eicon-animation-text';
	}

	/** Categories. */
	public function get_categories() {
		return array( 'modafie' );
	}

	/** Keywords. */
	public function get_keywords() {
		return array( 'marquee', 'ticker', 'scroll', 'announcement', 'modafie' );
	}

	/** Lighter DOM. */
	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	/** Controls. */
	protected function register_controls() {
		$this->start_controls_section( 'content', array( 'label' => esc_html__( 'Items', 'modafie' ) ) );

		$repeater = new Repeater();
		$repeater->add_control(
			'text',
			array(
				'label'       => esc_html__( 'Text', 'modafie' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => esc_html__( 'Marquee item', 'modafie' ),
				'label_block' => true,
				'dynamic'     => array( 'active' => true ),
			)
		);
		$repeater->add_control(
			'link',
			array(
				'label'   => esc_html__( 'Link', 'modafie' ),
				'type'    => Controls_Manager::URL,
				'dynamic' => array( 'active' => true ),
			)
		);
		$this->add_control(
			'items',
			array(
				'label'       => esc_html__( 'Items', 'modafie' ),
				'type'        => Controls_Manager::REPEATER,
				'fields'      => $repeater->get_controls(),
				'default'     => array(
					array( 'text' => esc_html__( 'First message', 'modafie' ) ),
					array( 'text' => esc_html__( 'Second message', 'modafie' ) ),
					array( 'text' => esc_html__( 'Third message', 'modafie' ) ),
				),
				'title_field' => '{{{ text }}}',
			)
		);
		$this->add_control(
			'separator',
			array(
				'label'   => esc_html__( 'Separator', 'modafie' ),
				'type'    => Controls_Manager::TEXT,
				'default' => '✦',
			)
		);
		$this->add_control(
			'speed',
			array(
				'label'   => esc_html__( 'Speed (px per second)', 'modafie' ),
				'type'    => Controls_Manager::NUMBER,
				'min'     => 10,
				'max'     => 400,
				'default' => 60,
			)
		);
		$this->add_control(
			'direction',
			array(
				'label'   => esc_html__( 'Direction', 'modafie' ),
				'type'    => Controls_Manager::SELECT,
				'options' => array(
					'left'  => esc_html__( 'Left', 'modafie' ),
					'right' => esc_html__( 'Right', 'modafie' ),
				),
				'default' => 'left',
			)
		);
		$this->add_control(
			'pause_on_hover',
			array(
				'label'        => esc_html__( 'Pause on hover', 'modafie' ),
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default'      => 'yes',
			)
		);
		$this->end_controls_section();

		$this->start_controls_section(
			'style',
			array(
				'label' => esc_html__( 'Style', 'modafie' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			)
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			array(
				'name'     => 'typography',
				'selector' => '{{WRAPPER}} .mf-marquee__item',
				'global'   => array( 'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Typography::TYPOGRAPHY_PRIMARY ),
			)
		);
		$this->add_control(
			'color',
			array(
				'label'     => esc_html__( 'Text colour', 'modafie' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array( '{{WRAPPER}} .mf-marquee' => 'color: {{VALUE}};' ),
			)
		);
		$this->add_control(
			'separator_color',
			array(
				'label'     => esc_html__( 'Separator colour', 'modafie' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array( '{{WRAPPER}} .mf-marquee__item::after' => 'color: {{VALUE}};' ),
				'global'    => array( 'default' => \Elementor\Core\Kits\Documents\Tabs\Global_Colors::COLOR_ACCENT ),
			)
		);
		$this->add_control(
			'background',
			array(
				'label'     => esc_html__( 'Background', 'modafie' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => array( '{{WRAPPER}} .mf-marquee' => 'background-color: {{VALUE}};' ),
			)
		);
		$this->add_responsive_control(
			'padding',
			array(
				'label'      => esc_html__( 'Padding', 'modafie' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => array( 'px', 'em' ),
				'selectors'  => array( '{{WRAPPER}} .mf-marquee' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ),
			)
		);
		$this->add_responsive_control(
			'gap',
			array(
				'label'      => esc_html__( 'Gap', 'modafie' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array( 'px' => array( 'max' => 200 ) ),
				'selectors'  => array( '{{WRAPPER}} .mf-marquee' => '--mf-marquee-gap: {{SIZE}}{{UNIT}};' ),
			)
		);
		$this->end_controls_section();
	}

	/** Render. */
	protected function render() {
		$s     = $this->get_settings_for_display();
		$items = is_array( $s['items'] ) ? $s['items'] : array();
		if ( ! $items ) {
			return;
		}
		$classes = 'mf-marquee mf-marquee--auto' . ( 'right' === $s['direction'] ? ' mf-marquee--reverse' : '' ) . ( 'yes' === $s['pause_on_hover'] ? ' mf-marquee--pause' : '' );
		printf(
			'<div class="%1$s" data-speed="%2$d" data-separator="%3$s" style="--mf-marquee-sep:\'%4$s\'">',
			esc_attr( $classes ),
			absint( $s['speed'] ),
			esc_attr( $s['separator'] ),
			esc_attr( addcslashes( (string) $s['separator'], "'\\" ) )
		);
		echo '<div class="mf-marquee__track">';
		for ( $copy = 0; $copy < 2; $copy++ ) {
			echo '<div class="mf-marquee__group"' . ( $copy ? ' aria-hidden="true"' : '' ) . '>';
			foreach ( $items as $i => $item ) {
				$text = esc_html( $item['text'] );
				if ( ! empty( $item['link']['url'] ) ) {
					$key = 'link_' . $copy . '_' . $i;
					$this->add_link_attributes( $key, $item['link'] );
					if ( $copy ) {
						$this->add_render_attribute( $key, 'tabindex', '-1' );
					}
					$text = '<a ' . $this->get_render_attribute_string( $key ) . '>' . $text . '</a>';
				}
				echo '<span class="mf-marquee__item">' . $text . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
			}
			echo '</div>';
		}
		echo '</div></div>';
	}
}
