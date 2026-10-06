<?php
/**
 * Announcement bar (Customizer → Modafie Theme → Announcement bar).
 *
 * @package Modafie
 */

if ( ! get_theme_mod( 'modafie_announcement_enabled', true ) ) {
	return;
}
$modafie_items = modafie_announcement_items();
if ( ! $modafie_items ) {
	return;
}
$modafie_style = get_theme_mod( 'modafie_announcement_style', 'rotate' );
$modafie_theme = get_theme_mod( 'modafie_announcement_theme', 'dark' );
if ( 'static' === $modafie_style ) {
	$modafie_items = array_slice( $modafie_items, 0, 1 );
}
$modafie_classes = array( 'mf-announcement', 'mf-announcement--' . $modafie_theme, 'mf-announcement--' . $modafie_style );
if ( 'marquee' === $modafie_style ) {
	$modafie_classes[] = 'mf-marquee';
}
?>
<div class="<?php echo esc_attr( implode( ' ', $modafie_classes ) ); ?>" role="region" aria-label="<?php esc_attr_e( 'Announcements', 'modafie' ); ?>">
	<ul class="mf-announcement__list">
		<?php foreach ( $modafie_items as $modafie_i => $modafie_item ) : ?>
			<li class="mf-announcement__item<?php echo 0 === $modafie_i ? ' is-active' : ''; ?>">
				<?php if ( $modafie_item['url'] ) : ?>
					<a href="<?php echo esc_url( $modafie_item['url'] ); ?>"><?php echo esc_html( $modafie_item['text'] ); ?></a>
				<?php else : ?>
					<span><?php echo esc_html( $modafie_item['text'] ); ?></span>
				<?php endif; ?>
			</li>
		<?php endforeach; ?>
	</ul>
</div>
