<?php
/**
 * Built-in header: announcement marquee, sticky hide-on-scroll bar, mega menu, off-canvas mobile menu.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

$modafie_header_template = absint( get_theme_mod( 'modafie_header_template', 0 ) );
$modafie_messages        = get_theme_mod( 'modafie_announcement_enabled', true ) ? modafie_announcement_messages() : array();
$modafie_link            = get_theme_mod( 'modafie_announcement_link', '' );
$modafie_cta_text        = get_theme_mod( 'modafie_header_cta_text', '' );
$modafie_cta_url         = get_theme_mod( 'modafie_header_cta_url', '' );

if ( $modafie_messages ) :
	?>
	<div class="mf-announcement" role="region" aria-label="<?php esc_attr_e( 'Announcements', 'modafie' ); ?>">
		<?php echo $modafie_link ? '<a class="mf-announcement__link" href="' . esc_url( $modafie_link ) . '">' : ''; ?>
		<div class="mf-marquee mf-marquee--auto" data-speed="40">
			<div class="mf-marquee__track">
				<?php for ( $modafie_copy = 0; $modafie_copy < 2; $modafie_copy++ ) : ?>
					<div class="mf-marquee__group"<?php echo $modafie_copy ? ' aria-hidden="true"' : ''; ?>>
						<?php foreach ( $modafie_messages as $modafie_message ) : ?>
							<span class="mf-marquee__item"><?php echo esc_html( $modafie_message ); ?></span>
						<?php endforeach; ?>
					</div>
				<?php endfor; ?>
			</div>
		</div>
		<?php echo $modafie_link ? '</a>' : ''; ?>
	</div>
	<?php
endif;

if ( $modafie_header_template && get_post( $modafie_header_template ) ) :
	?>
	<header class="mf-header mf-header--elementor" data-mf-header>
		<?php modafie_render_elementor_template( $modafie_header_template ); ?>
	</header>
	<?php
	return;
endif;
?>
<header class="mf-header" data-mf-header>
	<div class="mf-header__inner">
		<button type="button" class="mf-header__burger" aria-controls="mf-offcanvas" aria-expanded="false" data-mf-offcanvas-open>
			<?php modafie_the_icon( 'menu' ); ?><span class="screen-reader-text"><?php esc_html_e( 'Open menu', 'modafie' ); ?></span>
		</button>

		<div class="mf-header__brand">
			<?php modafie_site_branding(); ?>
		</div>

		<nav class="mf-nav" aria-label="<?php esc_attr_e( 'Primary', 'modafie' ); ?>">
			<?php
			wp_nav_menu(
				array(
					'theme_location' => 'primary',
					'container'      => false,
					'menu_class'     => 'mf-nav__menu',
					'depth'          => 3,
					'walker'         => new Modafie_Walker_Nav(),
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
						'menu_class'     => 'mf-utility',
						'depth'          => 1,
					)
				);
			}
			?>
			<?php if ( get_theme_mod( 'modafie_header_search', false ) ) : ?>
				<button type="button" class="mf-header__icon" aria-controls="mf-search" aria-expanded="false" data-mf-search-toggle>
					<?php modafie_the_icon( 'search' ); ?><span class="screen-reader-text"><?php esc_html_e( 'Search', 'modafie' ); ?></span>
				</button>
			<?php endif; ?>
			<?php if ( $modafie_cta_text && $modafie_cta_url ) : ?>
				<a class="mf-btn mf-btn--sm mf-header__cta" href="<?php echo esc_url( $modafie_cta_url ); ?>"><?php echo esc_html( $modafie_cta_text ); ?></a>
			<?php endif; ?>
		</div>
	</div>

	<?php if ( get_theme_mod( 'modafie_header_search', false ) ) : ?>
		<div class="mf-search" id="mf-search" hidden>
			<div class="mf-search__inner"><?php get_search_form(); ?></div>
		</div>
	<?php endif; ?>
</header>

<div class="mf-offcanvas" id="mf-offcanvas" aria-hidden="true" data-mf-offcanvas>
	<div class="mf-offcanvas__backdrop" data-mf-offcanvas-close></div>
	<div class="mf-offcanvas__panel" role="dialog" aria-modal="true" aria-label="<?php esc_attr_e( 'Menu', 'modafie' ); ?>">
		<div class="mf-offcanvas__head">
			<?php modafie_site_branding(); ?>
			<button type="button" class="mf-header__icon" data-mf-offcanvas-close>
				<?php modafie_the_icon( 'close' ); ?><span class="screen-reader-text"><?php esc_html_e( 'Close menu', 'modafie' ); ?></span>
			</button>
		</div>
		<nav class="mf-offcanvas__nav" aria-label="<?php esc_attr_e( 'Mobile', 'modafie' ); ?>">
			<?php
			wp_nav_menu(
				array(
					'theme_location' => 'primary',
					'container'      => false,
					'menu_class'     => 'mf-mobile-menu',
					'depth'          => 3,
					'walker'         => new Modafie_Walker_Nav(),
					'fallback_cb'    => 'modafie_menu_fallback',
				)
			);
			?>
		</nav>
		<?php if ( $modafie_cta_text && $modafie_cta_url ) : ?>
			<a class="mf-btn mf-offcanvas__cta" href="<?php echo esc_url( $modafie_cta_url ); ?>"><?php echo esc_html( $modafie_cta_text ); ?></a>
		<?php endif; ?>
	</div>
</div>
