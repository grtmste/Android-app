<?php
/**
 * Search form.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

$modafie_search_id = wp_unique_id( 'mf-search-field-' );
?>
<form role="search" method="get" class="mf-searchform" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="<?php echo esc_attr( $modafie_search_id ); ?>"><?php esc_html_e( 'Search for:', 'modafie' ); ?></label>
	<input type="search" id="<?php echo esc_attr( $modafie_search_id ); ?>" class="mf-input" placeholder="<?php esc_attr_e( 'Search', 'modafie' ); ?>" value="<?php echo get_search_query(); ?>" name="s">
	<button type="submit" class="mf-btn"><?php esc_html_e( 'Search', 'modafie' ); ?></button>
</form>
