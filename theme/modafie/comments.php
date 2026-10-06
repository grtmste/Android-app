<?php
/**
 * Comments.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

if ( post_password_required() ) {
	return;
}
?>
<section id="comments" class="mf-container mf-comments">
	<?php if ( have_comments() ) : ?>
		<h2 class="mf-comments__title">
			<?php
			/* translators: %s: comment count. */
			printf( esc_html( _n( '%s comment', '%s comments', get_comments_number(), 'modafie' ) ), esc_html( number_format_i18n( get_comments_number() ) ) );
			?>
		</h2>
		<ol class="mf-comments__list">
			<?php
			wp_list_comments(
				array(
					'style'       => 'ol',
					'short_ping'  => true,
					'avatar_size' => 48,
				)
			);
			?>
		</ol>
		<?php the_comments_navigation(); ?>
		<?php if ( ! comments_open() ) : ?>
			<p class="mf-comments__closed"><?php esc_html_e( 'Comments are closed.', 'modafie' ); ?></p>
		<?php endif; ?>
	<?php endif; ?>
	<?php comment_form(); ?>
</section>
