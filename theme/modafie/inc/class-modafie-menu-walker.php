<?php
/**
 * Primary-menu walker with mega-menu support.
 *
 * A top-level item with the CSS class `mf-mega` renders its sub-menu as a full-width
 * panel. Its children become column headings and grandchildren the column links.
 * A child item with the class `mf-mega-promo` renders as an image tile; put the image URL
 * in the item's Description field (Appearance → Menus → Screen Options → Description).
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Mega-menu aware nav walker.
 */
class Modafie_Menu_Walker extends Walker_Nav_Menu {

	/**
	 * Whether the current top-level branch is a mega menu.
	 *
	 * @var bool
	 */
	private $in_mega = false;

	/**
	 * Start a sub-menu level.
	 *
	 * @param string   $output Output.
	 * @param int      $depth  Depth.
	 * @param stdClass $args   Args.
	 */
	public function start_lvl( &$output, $depth = 0, $args = null ) {
		if ( 0 === $depth && $this->in_mega ) {
			$output .= '<div class="mf-mega-panel"><div class="mf-mega-panel__inner"><ul class="mf-mega-columns">';
			return;
		}
		$classes = 0 === $depth ? 'sub-menu mf-dropdown' : 'sub-menu';
		$output .= '<ul class="' . esc_attr( $classes ) . '">';
	}

	/**
	 * End a sub-menu level.
	 *
	 * @param string   $output Output.
	 * @param int      $depth  Depth.
	 * @param stdClass $args   Args.
	 */
	public function end_lvl( &$output, $depth = 0, $args = null ) {
		if ( 0 === $depth && $this->in_mega ) {
			$output .= '</ul></div></div>';
			return;
		}
		$output .= '</ul>';
	}

	/**
	 * Start an element.
	 *
	 * @param string   $output Output.
	 * @param WP_Post  $item   Menu item.
	 * @param int      $depth  Depth.
	 * @param stdClass $args   Args.
	 * @param int      $id     Item id.
	 */
	public function start_el( &$output, $item, $depth = 0, $args = null, $id = 0 ) {
		$classes = empty( $item->classes ) ? array() : (array) $item->classes;
		if ( 0 === $depth ) {
			$this->in_mega = in_array( 'mf-mega', $classes, true );
		}

		if ( 1 === $depth && $this->in_mega && in_array( 'mf-mega-promo', $classes, true ) ) {
			$image   = trim( (string) $item->description );
			$output .= '<li class="mf-mega-promo">';
			$output .= '<a class="mf-mega-promo__link mf-hover-zoom" href="' . esc_url( $item->url ) . '">';
			if ( $image ) {
				$output .= '<img src="' . esc_url( $image ) . '" alt="" decoding="async" width="400" height="500">';
			}
			$output .= '<span class="mf-mega-promo__label">' . esc_html( $item->title ) . '</span></a>';
			return;
		}

		$has_children = in_array( 'menu-item-has-children', $classes, true );
		$classes[]    = 'menu-item-' . $item->ID;
		if ( 1 === $depth && $this->in_mega ) {
			$classes[] = 'mf-mega-column';
		}

		$class_names = implode( ' ', array_filter( apply_filters( 'nav_menu_css_class', $classes, $item, $args, $depth ) ) );
		$output     .= '<li class="' . esc_attr( $class_names ) . '">';

		$atts = array(
			'href'         => ! empty( $item->url ) ? $item->url : '',
			'target'       => ! empty( $item->target ) ? $item->target : '',
			'rel'          => ! empty( $item->xfn ) ? $item->xfn : ( '_blank' === $item->target ? 'noopener' : '' ),
			'title'        => ! empty( $item->attr_title ) ? $item->attr_title : '',
			'aria-current' => $item->current ? 'page' : '',
			'class'        => 1 === $depth && $this->in_mega ? 'mf-mega-heading' : 'mf-menu-link',
		);
		if ( 0 === $depth && $has_children ) {
			$atts['aria-haspopup'] = 'true';
			$atts['aria-expanded'] = 'false';
		}
		$atts = apply_filters( 'nav_menu_link_attributes', $atts, $item, $args, $depth );

		$attributes = '';
		foreach ( $atts as $attr => $value ) {
			if ( '' !== $value && false !== $value ) {
				$value       = 'href' === $attr ? esc_url( $value ) : esc_attr( $value );
				$attributes .= ' ' . $attr . '="' . $value . '"';
			}
		}

		$title   = apply_filters( 'nav_menu_item_title', apply_filters( 'the_title', $item->title, $item->ID ), $item, $args, $depth );
		$output .= '<a' . $attributes . '><span>' . wp_kses_post( $title ) . '</span></a>';
	}
}
