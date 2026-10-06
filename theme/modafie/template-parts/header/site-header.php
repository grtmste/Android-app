<?php
/**
 * Sticky site header with mega menu, search and off-canvas mobile menu.
 *
 * @package Modafie
 */

$modafie_behavior    = get_theme_mod( 'modafie_header_behavior', 'smart' );
$modafie_template_id = absint( get_theme_mod( 'modafie_header_template', 0 ) );
$modafie_custom      = $modafie_template_id ? modafie_get_elementor_template( $modafie_template_id ) : '';
?>
<header id="masthead" class="mf-header mf-header--<?php echo esc_attr( $modafie_behavior ); ?>" data-behavior="<?php echo esc_attr( $modafie_behavior ); ?>">
	<?php if ( $modafie_custom ) : ?>
		<div class="mf-header__custom">
			<?php echo $modafie_custom; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Elementor renders and escapes its own content. ?>
		</div>
	<?php else : ?>
		<div class="mf-header__inner">
			<button class="mf-header__toggle mf-icon-btn" type="button" aria-controls="mf-offcanvas" aria-expanded="false">
				<?php modafie_the_icon( 'menu' ); ?>
				<span class="screen-reader-text"><?php esc_html_e( 'Open menu', 'modafie' ); ?></span>
			</button>

			<div class="mf-header__brand">
				<?php if ( has_custom_logo() ) : ?>
					<?php the_custom_logo(); ?>
				<?php else : ?>
					<a class="mf-wordmark" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><?php bloginfo( 'name' ); ?></a>
				<?php endif; ?>
			</div>

			<nav class="mf-header__nav" aria-label="<?php esc_attr_e( 'Primary', 'modafie' ); ?>">
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'primary',
						'container'      => false,
						'menu_class'     => 'mf-menu',
						'depth'          => 3,
						'walker'         => new Modafie_Menu_Walker(),
						'fallback_cb'    => 'modafie_menu_fallback',
					)
				);
				?>
			</nav>

			<div class="mf-header__actions">
				<?php
				if ( has_nav_menu( 'utility' ) ) {
					wp_nav_menu(
						array(
							'theme_location' => 'utility',
							'container'      => false,
							'menu_class'     => 'mf-utility-menu',
							'depth'          => 1,
						)
					);
				}
				?>
				<?php if ( get_theme_mod( 'modafie_header_search', true ) ) : ?>
					<button class="mf-icon-btn mf-search-toggle" type="button" aria-controls="mf-search" aria-expanded="false">
						<?php modafie_the_icon( 'search' ); ?>
						<span class="screen-reader-text"><?php esc_html_e( 'Search', 'modafie' ); ?></span>
					</button>
				<?php endif; ?>
				<?php if ( class_exists( 'WooCommerce' ) ) : ?>
					<a class="mf-icon-btn" href="<?php echo esc_url( wc_get_page_permalink( 'myaccount' ) ); ?>">
						<?php modafie_the_icon( 'user' ); ?>
						<span class="screen-reader-text"><?php esc_html_e( 'Account', 'modafie' ); ?></span>
					</a>
					<a class="mf-icon-btn mf-cart-link" href="<?php echo esc_url( wc_get_cart_url() ); ?>">
						<?php modafie_the_icon( 'bag' ); ?>
						<span class="mf-cart-count"><?php echo esc_html( (string) ( WC()->cart ? WC()->cart->get_cart_contents_count() : 0 ) ); ?></span>
						<span class="screen-reader-text"><?php esc_html_e( 'Bag', 'modafie' ); ?></span>
					</a>
				<?php endif; ?>
			</div>
		</div>
	<?php endif; ?>

	<?php if ( get_theme_mod( 'modafie_header_search', true ) ) : ?>
		<div id="mf-search" class="mf-search-panel" hidden>
			<div class="mf-search-panel__inner">
				<?php get_search_form(); ?>
			</div>
		</div>
	<?php endif; ?>
</header>

<div id="mf-offcanvas" class="mf-offcanvas" hidden>
	<div class="mf-offcanvas__backdrop" data-mf-close></div>
	<div class="mf-offcanvas__panel" role="dialog" aria-modal="true" aria-label="<?php esc_attr_e( 'Menu', 'modafie' ); ?>">
		<div class="mf-offcanvas__head">
			<span class="mf-offcanvas__title"><?php bloginfo( 'name' ); ?></span>
			<button class="mf-icon-btn" type="button" data-mf-close>
				<?php modafie_the_icon( 'close' ); ?>
				<span class="screen-reader-text"><?php esc_html_e( 'Close menu', 'modafie' ); ?></span>
			</button>
		</div>
		<nav class="mf-offcanvas__nav" aria-label="<?php esc_attr_e( 'Mobile', 'modafie' ); ?>">
			<?php
			wp_nav_menu(
				array(
					'theme_location' => has_nav_menu( 'mobile' ) ? 'mobile' : 'primary',
					'container'      => false,
					'menu_class'     => 'mf-mobile-menu',
					'depth'          => 3,
					'fallback_cb'    => 'modafie_menu_fallback',
				)
			);
			if ( has_nav_menu( 'utility' ) ) {
				wp_nav_menu(
					array(
						'theme_location' => 'utility',
						'container'      => false,
						'menu_class'     => 'mf-mobile-utility',
						'depth'          => 1,
					)
				);
			}
			?>
		</nav>
	</div>
</div>
