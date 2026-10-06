<?php
/**
 * Site footer.
 *
 * @package Modafie
 */

if ( ! modafie_do_pro_location( 'footer' ) ) {
	get_template_part( 'template-parts/footer/site-footer' );
}
?>
</div><!-- #page -->

<?php wp_footer(); ?>
</body>
</html>
