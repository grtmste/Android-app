<?php
/**
 * Search form.
 *
 * @package Modafie
 */

$modafie_uid = wp_unique_id( 'search-' );
?>
<form role="search" method="get" class="mf-search-form" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="<?php echo esc_attr( $modafie_uid ); ?>"><?php esc_html_e( 'Search for:', 'modafie' ); ?></label>
	<input type="search" id="<?php echo esc_attr( $modafie_uid ); ?>" class="mf-search-form__input" placeholder="<?php esc_attr_e( 'What are you looking for?', 'modafie' ); ?>" value="<?php echo get_search_query(); ?>" name="s">
	<button type="submit" class="mf-search-form__submit">
		<?php modafie_the_icon( 'search', 20 ); ?>
		<span class="screen-reader-text"><?php esc_html_e( 'Search', 'modafie' ); ?></span>
	</button>
</form>
