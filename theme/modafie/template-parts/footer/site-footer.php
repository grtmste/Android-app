<?php
/**
 * Footer: Elementor template (Customizer → Modafie Header & Footer), otherwise menus + widget areas.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

$modafie_footer_template = absint( get_theme_mod( 'modafie_footer_template', 0 ) );
if ( $modafie_footer_template && get_post( $modafie_footer_template ) ) :
	?>
	<footer class="mf-footer mf-footer--elementor">
		<?php modafie_render_elementor_template( $modafie_footer_template ); ?>
	</footer>
	<?php
	return;
endif;

$modafie_copyright = (string) get_theme_mod( 'modafie_footer_copyright', '' );
if ( '' === $modafie_copyright ) {
	$modafie_copyright = '© {year} {site}';
}
$modafie_copyright = str_replace( array( '{year}', '{site}' ), array( gmdate( 'Y' ), get_bloginfo( 'name' ) ), $modafie_copyright );
$modafie_has_widgets = is_active_sidebar( 'footer-1' ) || is_active_sidebar( 'footer-2' ) || is_active_sidebar( 'footer-3' ) || is_active_sidebar( 'footer-4' );
?>
<footer class="mf-footer">
	<div class="mf-footer__inner">
		<?php if ( $modafie_has_widgets ) : ?>
			<div class="mf-footer__cols">
				<?php for ( $modafie_i = 1; $modafie_i <= 4; $modafie_i++ ) : ?>
					<div class="mf-footer__col"><?php dynamic_sidebar( 'footer-' . $modafie_i ); ?></div>
				<?php endfor; ?>
			</div>
		<?php elseif ( has_nav_menu( 'footer' ) ) : ?>
			<?php
			wp_nav_menu(
				array(
					'theme_location' => 'footer',
					'container'      => 'nav',
					'container_class' => 'mf-footer__menu',
					'container_aria_label' => __( 'Footer', 'modafie' ),
					'menu_class'     => 'mf-footer__cols',
					'depth'          => 2,
				)
			);
			?>
		<?php endif; ?>

		<div class="mf-footer__bottom">
			<p class="mf-footer__copy"><?php echo wp_kses_post( $modafie_copyright ); ?></p>
			<?php
			if ( has_nav_menu( 'legal' ) ) {
				wp_nav_menu(
					array(
						'theme_location' => 'legal',
						'container'      => false,
						'menu_class'     => 'mf-footer__legal',
						'depth'          => 1,
					)
				);
			}
			if ( has_nav_menu( 'social' ) ) {
				wp_nav_menu(
					array(
						'theme_location' => 'social',
						'container'      => false,
						'menu_class'     => 'mf-footer__social',
						'depth'          => 1,
					)
				);
			}
			?>
		</div>
	</div>
</footer>
