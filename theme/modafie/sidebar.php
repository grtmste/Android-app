<?php
/**
 * Blog sidebar (rendered below posts as a widget row).
 *
 * @package Modafie
 */

if ( ! is_active_sidebar( 'sidebar-1' ) ) {
	return;
}
?>
<aside id="secondary" class="mf-sidebar mf-container" aria-label="<?php esc_attr_e( 'Sidebar', 'modafie' ); ?>">
	<?php dynamic_sidebar( 'sidebar-1' ); ?>
</aside>
