<?php
/**
 * Footer: an Elementor template (Customizer → Modafie Theme → Footer) or the theme footer
 * built from widget areas and menus.
 *
 * @package Modafie
 */

$modafie_template_id = absint( get_theme_mod( 'modafie_footer_template', 0 ) );
$modafie_custom      = $modafie_template_id ? modafie_get_elementor_template( $modafie_template_id ) : '';
$modafie_copyright   = get_theme_mod( 'modafie_footer_copyright', '' );
if ( '' === $modafie_copyright ) {
	/* translators: 1: year, 2: site name. */
	$modafie_copyright = sprintf( esc_html__( '© %1$s %2$s. All rights reserved.', 'modafie' ), gmdate( 'Y' ), get_bloginfo( 'name' ) );
}
?>
<footer id="colophon" class="mf-footer<?php echo $modafie_custom ? ' mf-footer--elementor' : ''; ?>">
	<?php if ( $modafie_custom ) : ?>
		<?php echo $modafie_custom; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Elementor renders and escapes its own content. ?>
	<?php else : ?>
		<div class="mf-footer__main mf-container">
			<?php
			$modafie_has_widgets = false;
			for ( $modafie_i = 1; $modafie_i <= 4; $modafie_i++ ) {
				$modafie_has_widgets = $modafie_has_widgets || is_active_sidebar( 'footer-' . $modafie_i );
			}
			?>
			<?php if ( $modafie_has_widgets ) : ?>
				<div class="mf-footer__columns">
					<?php for ( $modafie_i = 1; $modafie_i <= 4; $modafie_i++ ) : ?>
						<div class="mf-footer__col">
							<?php dynamic_sidebar( 'footer-' . $modafie_i ); ?>
						</div>
					<?php endfor; ?>
				</div>
			<?php else : ?>
				<div class="mf-footer__brand">
					<a class="mf-wordmark" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php bloginfo( 'name' ); ?></a>
					<p><?php bloginfo( 'description' ); ?></p>
				</div>
			<?php endif; ?>
		</div>
	<?php endif; ?>

	<div class="mf-footer__bottom">
		<div class="mf-container mf-footer__bottom-inner">
			<p class="mf-footer__copyright"><?php echo wp_kses_post( $modafie_copyright ); ?></p>
			<?php
			if ( has_nav_menu( 'footer' ) ) {
				wp_nav_menu(
					array(
						'theme_location' => 'footer',
						'container'      => 'nav',
						'container_attr' => array( 'aria-label' => esc_attr__( 'Legal', 'modafie' ) ),
						'menu_class'     => 'mf-legal-menu',
						'depth'          => 1,
					)
				);
			}
			if ( has_nav_menu( 'social' ) ) {
				$modafie_social = wp_get_nav_menu_items( get_nav_menu_locations()['social'] );
				if ( $modafie_social ) {
					echo '<ul class="mf-social">';
					foreach ( $modafie_social as $modafie_link ) {
						printf(
							'<li><a href="%1$s" target="_blank" rel="noopener">%2$s<span class="screen-reader-text">%3$s</span></a></li>',
							esc_url( $modafie_link->url ),
							wp_kses( modafie_icon( modafie_social_icon_for( $modafie_link->url ), 20 ), modafie_icon_kses() ),
							esc_html( $modafie_link->title )
						);
					}
					echo '</ul>';
				}
			}
			?>
		</div>
	</div>
</footer>
