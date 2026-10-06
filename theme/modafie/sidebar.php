<?php
/**
 * Blog sidebar.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

if ( ! is_active_sidebar( 'sidebar-1' ) ) {
	return;
}
?>
<aside class="mf-sidebar" aria-label="<?php esc_attr_e( 'Sidebar', 'modafie' ); ?>">
	<?php dynamic_sidebar( 'sidebar-1' ); ?>
</aside>
