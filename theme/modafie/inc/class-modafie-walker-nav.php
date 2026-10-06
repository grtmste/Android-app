<?php
/**
 * Primary navigation walker with mega-menu support.
 *
 * Usage (Appearance → Menus, enable "CSS Classes" in Screen Options):
 *  - Add the class `mf-mega` to a top-level item → its sub-menu renders as a full-width mega panel.
 *    Second-level items become column titles, third-level items become the links in each column.
 *  - Add the class `mf-mega-feature` to a second-level item and paste an image URL into its
 *    Description field → rendered as an image tile inside the panel.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Walker for the primary menu.
 */
class Modafie_Walker_Nav extends Walker_Nav_Menu {

	/**
	 * Whether the current top-level item is a mega item.
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
			$output .= '<div class="mf-mega-panel"><div class="mf-mega-panel__inner"><ul class="sub-menu mf-mega-cols">';
			return;
		}
		$output .= '<ul class="sub-menu">';
	}

	/**
	 * End a sub-menu level.
	 *
	 * @param string   $output Output.
	 * @param int      $depth  Depth.
	 * @param stdClass $args   Args.
	 */
	public function end_lvl( &$output, $depth = 0, $args = null ) {
		$output .= ( 0 === $depth && $this->in_mega ) ? '</ul></div></div>' : '</ul>';
	}

	/**
	 * Start an element.
	 *
	 * @param string   $output Output.
	 * @param WP_Post  $item   Menu item.
	 * @param int      $depth  Depth.
	 * @param stdClass $args   Args.
	 * @param int      $id     ID.
	 */
	public function start_el( &$output, $item, $depth = 0, $args = null, $id = 0 ) {
		$classes = empty( $item->classes ) ? array() : (array) $item->classes;
		if ( 0 === $depth ) {
			$this->in_mega = in_array( 'mf-mega', $classes, true );
		}
		$has_children = in_array( 'menu-item-has-children', $classes, true );

		if ( 1 === $depth && $this->in_mega && in_array( 'mf-mega-feature', $classes, true ) && ! empty( $item->description ) && wp_http_validate_url( trim( $item->description ) ) ) {
			$output .= sprintf(
				'<li class="mf-mega-feature"><a href="%1$s"><img src="%2$s" alt="" loading="lazy" decoding="async" width="400" height="500"><span>%3$s</span></a>',
				esc_url( $item->url ),
				esc_url( trim( $item->description ) ),
				esc_html( $item->title )
			);
			return;
		}

		$li_classes = array_filter( array_map( 'sanitize_html_class', $classes ) );
		$li_classes[] = 'menu-item-' . $item->ID;
		$output      .= '<li class="' . esc_attr( implode( ' ', array_unique( $li_classes ) ) ) . '">';

		$atts = array(
			'href'         => ! empty( $item->url ) ? $item->url : '',
			'target'       => ! empty( $item->target ) ? $item->target : '',
			'rel'          => ! empty( $item->xfn ) ? $item->xfn : ( '_blank' === $item->target ? 'noopener' : '' ),
			'title'        => ! empty( $item->attr_title ) ? $item->attr_title : '',
			'aria-current' => $item->current ? 'page' : '',
			'class'        => 'mf-nav__link',
		);
		$atts = apply_filters( 'nav_menu_link_attributes', $atts, $item, $args, $depth );

		$attr_html = '';
		foreach ( $atts as $attr => $value ) {
			if ( '' !== $value && null !== $value ) {
				$value      = 'href' === $attr ? esc_url( $value ) : esc_attr( $value );
				$attr_html .= ' ' . $attr . '="' . $value . '"';
			}
		}
		$title = apply_filters( 'nav_menu_item_title', apply_filters( 'the_title', $item->title, $item->ID ), $item, $args, $depth );

		$output .= '<a' . $attr_html . '>' . wp_kses_post( $title ) . '</a>';
		if ( $has_children ) {
			$output .= sprintf(
				'<button type="button" class="mf-submenu-toggle" aria-expanded="false"><span class="screen-reader-text">%1$s</span>%2$s</button>',
				/* translators: %s: menu item title. */
				esc_html( sprintf( __( 'Show submenu for %s', 'modafie' ), wp_strip_all_tags( $title ) ) ),
				modafie_icon( 'chevron' )
			);
		}
	}
}
