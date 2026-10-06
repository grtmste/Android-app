<?php
/**
 * One-click demo importer.
 *
 * Reads theme/demo/manifest.json and rebuilds the Modafie site as editable Elementor content:
 *   plugins → kit → media → templates → pages → menus → finalize
 *
 * Every step is idempotent: media, templates and pages are keyed by `_modafie_demo_key`
 * meta, so re-running updates in place instead of duplicating.
 *
 * Also available on the command line: `wp modafie import [--step=<step>]`.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Importer.
 */
class Modafie_Importer {

	const META_KEY   = '_modafie_demo_key';
	const MAP_OPTION = 'modafie_demo_map';
	const DONE       = 'modafie_demo_imported';

	/**
	 * Step order. `media` is batched.
	 *
	 * @var string[]
	 */
	public static $steps = array( 'plugins', 'kit', 'media', 'templates', 'pages', 'menus', 'finalize' );

	/**
	 * Manifest cache.
	 *
	 * @var array|null
	 */
	private $manifest = null;

	/**
	 * Demo directory.
	 */
	public function dir() {
		return trailingslashit( get_template_directory() ) . 'demo/';
	}

	/**
	 * Demo manifest.
	 *
	 * @return array
	 */
	public function manifest() {
		if ( null === $this->manifest ) {
			$file           = $this->dir() . 'manifest.json';
			$this->manifest = file_exists( $file ) ? (array) json_decode( (string) file_get_contents( $file ), true ) : array(); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
		}
		return $this->manifest;
	}

	/**
	 * Read a JSON file from the demo folder.
	 *
	 * @param string $rel Relative path.
	 * @return array
	 */
	private function json( $rel ) {
		$path = realpath( $this->dir() . $rel );
		if ( ! $path || 0 !== strpos( $path, realpath( $this->dir() ) ) || ! is_readable( $path ) ) {
			return array();
		}
		return (array) json_decode( (string) file_get_contents( $path ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
	}

	/**
	 * Current ID map (media/templates/pages/menus).
	 *
	 * @return array
	 */
	public function map() {
		$map = get_option( self::MAP_OPTION, array() );
		return wp_parse_args( is_array( $map ) ? $map : array(), array( 'media' => array(), 'templates' => array(), 'pages' => array(), 'menus' => array() ) );
	}

	/**
	 * Persist the ID map.
	 *
	 * @param array $map Map.
	 */
	private function save_map( $map ) {
		update_option( self::MAP_OPTION, $map, false );
	}

	/**
	 * Run one step.
	 *
	 * @param string $step   Step slug.
	 * @param int    $offset Batch offset (media step).
	 * @return array{done:bool,next_offset?:int,message:string,warnings?:string[]}|WP_Error
	 */
	public function run( $step, $offset = 0 ) {
		if ( ! in_array( $step, self::$steps, true ) ) {
			return new WP_Error( 'modafie_step', __( 'Unknown import step.', 'modafie' ) );
		}
		if ( 'plugins' !== $step && ! did_action( 'elementor/init' ) ) {
			return new WP_Error( 'modafie_no_elementor', __( 'Elementor is not active. Run the plugin step first.', 'modafie' ) );
		}
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 300 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- may be disabled.
		}
		wp_raise_memory_limit( 'admin' );
		return call_user_func( array( $this, 'step_' . $step ), absint( $offset ) );
	}

	/* ------------------------------------------------------------------ plugins */

	/**
	 * Install / activate Elementor (free) from WordPress.org if needed.
	 */
	private function step_plugins() {
		$plugin = 'elementor/elementor.php';
		if ( did_action( 'elementor/loaded' ) && is_plugin_active( $plugin ) ) {
			return array( 'done' => true, 'message' => __( 'Elementor is active.', 'modafie' ) );
		}
		if ( ! current_user_can( 'install_plugins' ) || ! current_user_can( 'activate_plugins' ) ) {
			return new WP_Error( 'modafie_caps', __( 'You need permission to install and activate plugins.', 'modafie' ) );
		}
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		$installed   = get_plugins();
		$was_missing = ! isset( $installed[ $plugin ] );
		if ( $was_missing ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/misc.php';
			require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
			require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
			$api = plugins_api(
				'plugin_information',
				array(
					'slug'   => 'elementor',
					'fields' => array( 'sections' => false ),
				)
			);
			if ( is_wp_error( $api ) ) {
				return new WP_Error( 'modafie_install', sprintf( /* translators: %s: error. */ __( 'Could not reach WordPress.org to download Elementor (%s). Install Elementor from Plugins → Add New, then run the import again.', 'modafie' ), $api->get_error_message() ) );
			}
			$skin     = new WP_Ajax_Upgrader_Skin();
			$upgrader = new Plugin_Upgrader( $skin );
			$result   = $upgrader->install( $api->download_link );
			if ( is_wp_error( $result ) || ! $result ) {
				$err = is_wp_error( $result ) ? $result->get_error_message() : implode( ' ', (array) $skin->get_error_messages() );
				return new WP_Error( 'modafie_install', sprintf( /* translators: %s: error. */ __( 'Elementor could not be installed: %s', 'modafie' ), $err ) );
			}
			wp_clean_plugins_cache();
		}
		$activated = activate_plugin( $plugin, '', false, true );
		if ( is_wp_error( $activated ) ) {
			return $activated;
		}
		delete_transient( 'elementor_activation_redirect' );
		update_option( 'elementor_onboarded', true );
		return array( 'done' => true, 'message' => $was_missing ? __( 'Elementor installed and activated.', 'modafie' ) : __( 'Elementor activated.', 'modafie' ) );
	}

	/* ------------------------------------------------------------------ kit + Elementor settings */

	/**
	 * Apply global colours/fonts/buttons/layout to the active Elementor Kit and set Elementor options.
	 */
	private function step_kit() {
		$m = $this->manifest();

		// Elementor options: let the kit + theme drive styling, enable containers and leaner markup.
		update_option( 'elementor_cpt_support', array_values( array_unique( array_merge( (array) get_option( 'elementor_cpt_support', array( 'page', 'post' ) ), array( 'page', 'post' ) ) ) ) );
		update_option( 'elementor_disable_color_schemes', 'yes' );
		update_option( 'elementor_disable_typography_schemes', 'yes' );
		update_option( 'elementor_google_font', '0' );
		update_option( 'elementor_font_display', 'swap' );
		update_option( 'elementor_css_print_method', 'external' );
		update_option( 'elementor_load_fa4_shim', '' );
		update_option( 'elementor_onboarded', true );
		foreach ( (array) ( $m['elementor_experiments'] ?? array() ) as $feature => $state ) {
			update_option( 'elementor_experiment-' . sanitize_key( $feature ), in_array( $state, array( 'active', 'inactive', 'default' ), true ) ? $state : 'default' );
		}

		$kits   = \Elementor\Plugin::$instance->kits_manager;
		$kit_id = $kits->get_active_id();
		if ( ! $kit_id || ! get_post( $kit_id ) ) {
			$kit_id = $kits->create_default();
			update_option( \Elementor\Core\Kits\Manager::OPTION_ACTIVE, $kit_id );
		}
		$kit_settings = $this->json( $m['kit'] ?? 'kit.json' );
		$kit          = \Elementor\Plugin::$instance->documents->get( $kit_id, false );
		if ( ! $kit ) {
			return new WP_Error( 'modafie_kit', __( 'The Elementor kit could not be loaded.', 'modafie' ) );
		}
		$current = (array) $kit->get_meta( '_elementor_page_settings' );
		$merged  = array_merge( $current, $kit_settings );
		$kit->save( array( 'settings' => $merged ) );
		return array( 'done' => true, 'message' => __( 'Global colours, fonts, buttons and layout applied to Elementor Site Settings.', 'modafie' ) );
	}

	/* ------------------------------------------------------------------ media */

	/**
	 * Import media in batches.
	 *
	 * @param int $offset Offset.
	 */
	private function step_media( $offset ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$items    = array_values( (array) ( $this->manifest()['media'] ?? array() ) );
		$batch    = 4;
		$map      = $this->map();
		$warnings = array();
		$slice    = array_slice( $items, $offset, $batch );

		add_filter( 'wp_update_attachment_metadata', array( $this, 'svg_metadata' ), 5, 2 );
		foreach ( $slice as $item ) {
			$key      = sanitize_key( $item['key'] );
			$existing = $this->find_by_key( 'attachment', $key );
			if ( $existing && get_attached_file( $existing ) && file_exists( get_attached_file( $existing ) ) ) {
				if ( ! empty( $item['alt'] ) ) {
					update_post_meta( $existing, '_wp_attachment_image_alt', sanitize_text_field( $item['alt'] ) );
				}
				$map['media'][ $key ] = $existing;
				continue;
			}
			$src = realpath( $this->dir() . $item['file'] );
			if ( ! $src || 0 !== strpos( $src, realpath( $this->dir() ) ) ) {
				/* translators: %s: file name. */
				$warnings[] = sprintf( __( 'Missing demo file %s', 'modafie' ), $item['file'] );
				continue;
			}
			$title = ! empty( $item['title'] ) ? $item['title'] : pathinfo( $src, PATHINFO_FILENAME );
			$id    = 'svg' === strtolower( pathinfo( $src, PATHINFO_EXTENSION ) ) ? $this->attach_svg( $src, $title, $key ) : $this->sideload( $src, $title, $key );
			if ( is_wp_error( $id ) ) {
				$warnings[] = basename( $src ) . ': ' . $id->get_error_message();
				continue;
			}
			if ( ! empty( $item['alt'] ) ) {
				update_post_meta( $id, '_wp_attachment_image_alt', sanitize_text_field( $item['alt'] ) );
			}
			$map['media'][ $key ] = $id;
		}
		remove_filter( 'wp_update_attachment_metadata', array( $this, 'svg_metadata' ), 5 );
		$this->save_map( $map );

		$next = $offset + count( $slice );
		return array(
			'done'        => $next >= count( $items ),
			'next_offset' => $next,
			'total'       => count( $items ),
			/* translators: 1: imported count, 2: total. */
			'message'     => sprintf( __( 'Media %1$d / %2$d', 'modafie' ), $next, count( $items ) ),
			'warnings'    => $warnings,
		);
	}

	/**
	 * Raster images and video: standard WordPress sideload (thumbnails, metadata, MIME checks).
	 *
	 * @param string $src   Absolute path inside the theme's demo folder.
	 * @param string $title Attachment title.
	 * @param string $key   Demo key.
	 * @return int|WP_Error
	 */
	private function sideload( $src, $title, $key ) {
		$tmp = wp_tempnam( basename( $src ) );
		if ( ! $tmp || ! copy( $src, $tmp ) ) {
			return new WP_Error( 'modafie_copy', __( 'Could not copy the file to a temporary location.', 'modafie' ) );
		}
		$id = media_handle_sideload(
			array(
				'name'     => basename( $src ),
				'tmp_name' => $tmp,
			),
			0,
			null,
			array(
				'post_title' => $title,
				'meta_input' => array( self::META_KEY => $key ),
			)
		);
		if ( is_wp_error( $id ) ) {
			wp_delete_file( $tmp );
		}
		return $id;
	}

	/**
	 * SVG icons. WordPress does not allow SVG uploads, so the bundled files (sanitized when the
	 * demo was built, and re-checked here) are copied into uploads and attached directly.
	 *
	 * @param string $src   Absolute path inside the theme's demo folder.
	 * @param string $title Attachment title.
	 * @param string $key   Demo key.
	 * @return int|WP_Error
	 */
	private function attach_svg( $src, $title, $key ) {
		if ( ! self::is_safe_svg( (string) file_get_contents( $src ) ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
			return new WP_Error( 'modafie_svg', __( 'SVG skipped: it contains scripts or external references.', 'modafie' ) );
		}
		$uploads = wp_upload_dir();
		if ( ! empty( $uploads['error'] ) ) {
			return new WP_Error( 'modafie_uploads', $uploads['error'] );
		}
		$name = wp_unique_filename( $uploads['path'], sanitize_file_name( basename( $src ) ) );
		$dest = trailingslashit( $uploads['path'] ) . $name;
		if ( ! copy( $src, $dest ) ) {
			return new WP_Error( 'modafie_copy', __( 'Could not copy the SVG into the uploads folder.', 'modafie' ) );
		}
		$id = wp_insert_attachment(
			array(
				'post_mime_type' => 'image/svg+xml',
				'post_title'     => $title,
				'post_status'    => 'inherit',
				'guid'           => trailingslashit( $uploads['url'] ) . $name,
				'meta_input'     => array( self::META_KEY => $key ),
			),
			$dest,
			0,
			true
		);
		if ( is_wp_error( $id ) ) {
			wp_delete_file( $dest );
			return $id;
		}
		wp_update_attachment_metadata( $id, array( 'file' => _wp_relative_upload_path( $dest ) ) );
		return $id;
	}

	/**
	 * Fill SVG width/height from the local file (otherwise Elementor fetches the SVG over HTTP to measure it).
	 *
	 * @param array $data Metadata.
	 * @param int   $id   Attachment ID.
	 */
	public function svg_metadata( $data, $id ) {
		if ( 'image/svg+xml' !== get_post_mime_type( $id ) || ( ! empty( $data['width'] ) && ! empty( $data['height'] ) ) ) {
			return $data;
		}
		$file = get_attached_file( $id );
		$svg  = $file && is_readable( $file ) ? (string) file_get_contents( $file, false, null, 0, 4096 ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
		$data = is_array( $data ) ? $data : array();
		if ( preg_match( '/viewBox="\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i', $svg, $vb ) ) {
			$data['width']  = (int) round( (float) $vb[1] );
			$data['height'] = (int) round( (float) $vb[2] );
		}
		if ( preg_match( '/<svg[^>]*\swidth="([\d.]+)/i', $svg, $w ) && preg_match( '/<svg[^>]*\sheight="([\d.]+)/i', $svg, $h ) ) {
			$data['width']  = (int) round( (float) $w[1] );
			$data['height'] = (int) round( (float) $h[1] );
		}
		if ( empty( $data['width'] ) ) {
			$data['width']  = 48;
			$data['height'] = 48;
		}
		return $data;
	}

	/**
	 * Reject SVGs with active content (scripts, event handlers, foreignObject, external/JS references).
	 *
	 * @param string $svg Markup.
	 */
	public static function is_safe_svg( $svg ) {
		if ( '' === trim( $svg ) || false === stripos( $svg, '<svg' ) ) {
			return false;
		}
		return ! preg_match( '/<\s*(script|foreignObject|iframe|embed|object)\b|\son[a-z]+\s*=|javascript:|(?:xlink:)?href\s*=\s*["\'](?!#)/i', $svg );
	}

	/* ------------------------------------------------------------------ templates */

	/**
	 * Each demo section is also saved to Templates → Saved Templates (reusable, insertable from the editor library).
	 */
	private function step_templates() {
		$m    = $this->manifest();
		$map  = $this->map();
		$type = \Elementor\Plugin::$instance->documents->get_document_type( 'container', false ) ? 'container' : 'section';
		$n    = 0;
		foreach ( (array) ( $m['templates'] ?? array() ) as $tpl ) {
			$key  = sanitize_key( $tpl['key'] );
			$data = $this->resolve_tokens( $this->json( $tpl['file'] ), $map );
			$id   = $this->find_by_key( 'elementor_library', $key );
			$doc  = $id ? \Elementor\Plugin::$instance->documents->get( $id, false ) : null;
			$tpl_type = ! empty( $tpl['type'] ) && 'page' === $tpl['type'] ? 'page' : $type;
			if ( ! $doc ) {
				$doc = \Elementor\Plugin::$instance->documents->create(
					$tpl_type,
					array(
						'post_title'  => $tpl['title'],
						'post_status' => 'publish',
					),
					array( self::META_KEY => $key )
				);
				if ( is_wp_error( $doc ) ) {
					return $doc;
				}
			} else {
				wp_update_post( array( 'ID' => $doc->get_id(), 'post_title' => $tpl['title'], 'post_status' => 'publish' ) );
			}
			$doc->save( array( 'elements' => $data ) );
			$map['templates'][ $key ] = $doc->get_id();
			++$n;
		}
		$this->save_map( $map );
		/* translators: %d: number of templates. */
		return array( 'done' => true, 'message' => sprintf( __( '%d section templates saved to the Elementor library.', 'modafie' ), $n ) );
	}

	/* ------------------------------------------------------------------ pages */

	/**
	 * Create/update pages with their Elementor data and set the static front page.
	 */
	private function step_pages() {
		$m     = $this->manifest();
		$map   = $this->map();
		$pages = (array) ( $m['pages'] ?? array() );

		// Pass 1: make sure every page exists so internal links can resolve.
		foreach ( $pages as $p ) {
			$key = 'page-' . sanitize_key( $p['slug'] );
			$id  = $this->find_by_key( 'page', $key );
			if ( ! $id ) {
				$existing = get_page_by_path( $p['slug'], OBJECT, 'page' );
				// Adopt an untouched page with the same slug (e.g. WordPress' own "privacy-policy" draft).
				$id = $existing && ( 'privacy-policy' === $p['slug'] || '' === trim( $existing->post_content ) ) ? $existing->ID : 0;
			}
			$postarr = array(
				'ID'           => $id,
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => $p['title'],
				'post_name'    => 'home' === $p['slug'] ? 'home' : $p['slug'],
				'post_content' => '',
				'menu_order'   => (int) ( $p['order'] ?? 0 ),
			);
			$id = $id ? wp_update_post( $postarr, true ) : wp_insert_post( $postarr, true );
			if ( is_wp_error( $id ) ) {
				return $id;
			}
			update_post_meta( $id, self::META_KEY, $key );
			$map['pages'][ $p['slug'] ] = $id;
		}
		$this->save_map( $map );

		// Pass 2: Elementor data.
		foreach ( $pages as $p ) {
			$id = $map['pages'][ $p['slug'] ];
			update_post_meta( $id, '_elementor_edit_mode', 'builder' );
			update_post_meta( $id, '_elementor_template_type', 'wp-page' );
			update_post_meta( $id, '_wp_page_template', ! empty( $p['template'] ) ? $p['template'] : 'elementor_header_footer' );
			$data = $this->resolve_tokens( $this->json( $p['file'] ), $map );
			$doc  = \Elementor\Plugin::$instance->documents->get( $id, false );
			if ( ! $doc ) {
				/* translators: %s: page title. */
				return new WP_Error( 'modafie_doc', sprintf( __( 'Could not open %s in Elementor.', 'modafie' ), $p['title'] ) );
			}
			$settings = array_merge( (array) $doc->get_meta( '_elementor_page_settings' ), (array) ( $p['settings'] ?? array() ), array( 'template' => ! empty( $p['template'] ) ? $p['template'] : 'elementor_header_footer' ) );
			$doc->save(
				array(
					'elements' => $data,
					'settings' => $settings,
				)
			);
			if ( ! empty( $p['meta']['description'] ) ) {
				update_post_meta( $id, '_modafie_meta_description', sanitize_text_field( $p['meta']['description'] ) );
			}
			if ( ! empty( $p['isFront'] ) ) {
				update_option( 'show_on_front', 'page' );
				update_option( 'page_on_front', $id );
			}
		}
		/* translators: %d: number of pages. */
		return array( 'done' => true, 'message' => sprintf( __( '%d pages built with Elementor.', 'modafie' ), count( $pages ) ) );
	}

	/* ------------------------------------------------------------------ menus */

	/**
	 * Create/replace the demo menus and assign theme locations.
	 */
	private function step_menus() {
		$m         = $this->manifest();
		$map       = $this->map();
		$locations = (array) get_theme_mod( 'nav_menu_locations', array() );
		foreach ( (array) ( $m['menus'] ?? array() ) as $location => $menu ) {
			$name = $menu['name'];
			$obj  = wp_get_nav_menu_object( $name );
			$id   = $obj ? (int) $obj->term_id : wp_create_nav_menu( $name );
			if ( is_wp_error( $id ) ) {
				return $id;
			}
			foreach ( (array) wp_get_nav_menu_items( $id, array( 'post_status' => 'any' ) ) as $old ) {
				wp_delete_post( $old->ID, true );
			}
			$this->add_menu_items( $id, (array) $menu['items'], 0, $map );
			$locations[ $location ] = $id;
			$map['menus'][ $location ] = $id;
		}
		set_theme_mod( 'nav_menu_locations', $locations );
		$this->save_map( $map );
		return array( 'done' => true, 'message' => __( 'Menus created and assigned.', 'modafie' ) );
	}

	/**
	 * Recursively add menu items.
	 *
	 * @param int   $menu_id Menu.
	 * @param array $items   Items.
	 * @param int   $parent  Parent item ID.
	 * @param array $map     Map.
	 */
	private function add_menu_items( $menu_id, $items, $parent, $map ) {
		foreach ( $items as $i => $item ) {
			$args = array(
				'menu-item-title'       => $item['title'],
				'menu-item-status'      => 'publish',
				'menu-item-parent-id'   => $parent,
				'menu-item-position'    => $i + 1,
				'menu-item-classes'     => $item['classes'] ?? '',
				'menu-item-description' => $item['description'] ?? '',
			);
			if ( ! empty( $item['page'] ) && ! empty( $map['pages'][ $item['page'] ] ) ) {
				$args['menu-item-type']      = 'post_type';
				$args['menu-item-object']    = 'page';
				$args['menu-item-object-id'] = $map['pages'][ $item['page'] ];
			} else {
				$args['menu-item-type'] = 'custom';
				$args['menu-item-url']  = esc_url_raw( $this->resolve_tokens( $item['url'] ?? '#', $map ) );
			}
			$item_id = wp_update_nav_menu_item( $menu_id, 0, $args );
			if ( ! is_wp_error( $item_id ) && ! empty( $item['children'] ) ) {
				$this->add_menu_items( $menu_id, $item['children'], $item_id, $map );
			}
		}
	}

	/* ------------------------------------------------------------------ finalize */

	/**
	 * Theme mods, site identity, Elementor CSS regeneration.
	 */
	private function step_finalize() {
		$m   = $this->manifest();
		$map = $this->map();
		foreach ( (array) ( $m['theme_mods'] ?? array() ) as $mod => $value ) {
			set_theme_mod( sanitize_key( $mod ), $this->resolve_tokens( $value, $map ) );
		}
		if ( ! empty( $m['footer_template'] ) && ! empty( $map['templates'][ $m['footer_template'] ] ) ) {
			set_theme_mod( 'modafie_footer_template', (int) $map['templates'][ $m['footer_template'] ] );
		}
		if ( ! empty( $m['site']['logo'] ) && ! empty( $map['media'][ $m['site']['logo'] ] ) ) {
			set_theme_mod( 'custom_logo', (int) $map['media'][ $m['site']['logo'] ] );
		}
		if ( ! empty( $m['site']['icon'] ) && ! empty( $map['media'][ $m['site']['icon'] ] ) ) {
			update_option( 'site_icon', (int) $map['media'][ $m['site']['icon'] ] );
		}
		if ( ! empty( $m['site']['title'] ) && in_array( get_option( 'blogname' ), array( '', 'My WordPress Website', 'My Blog' ), true ) ) {
			update_option( 'blogname', sanitize_text_field( $m['site']['title'] ) );
		}
		if ( ! get_option( 'permalink_structure' ) ) {
			update_option( 'permalink_structure', '/%postname%/' );
		}
		flush_rewrite_rules( false );

		\Elementor\Plugin::$instance->files_manager->clear_cache();
		update_option( self::DONE, array( 'version' => MODAFIE_VERSION, 'time' => time(), 'source' => $m['source'] ?? 'unknown' ), false );
		return array(
			'done'    => true,
			'message' => __( 'Done! Elementor CSS regenerated.', 'modafie' ),
			'home'    => home_url( '/' ),
			'edit'    => ! empty( $map['pages']['home'] ) ? admin_url( 'post.php?post=' . (int) $map['pages']['home'] . '&action=elementor' ) : '',
		);
	}

	/* ------------------------------------------------------------------ helpers */

	/**
	 * Find a post by demo key.
	 *
	 * @param string $post_type Post type.
	 * @param string $key       Key.
	 */
	public function find_by_key( $post_type, $key ) {
		$ids = get_posts(
			array(
				'post_type'        => $post_type,
				'post_status'      => 'any',
				'meta_key'         => self::META_KEY, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'       => $key, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
				'fields'           => 'ids',
				'posts_per_page'   => 1,
				'no_found_rows'    => true,
				'suppress_filters' => true,
			)
		);
		return $ids ? (int) $ids[0] : 0;
	}

	/**
	 * Replace demo tokens recursively:
	 *   {{mf-media:KEY:url}} → attachment URL   {{mf-media:KEY:id}} → attachment ID (int)
	 *   {{mf-page:SLUG}}     → permalink         {{mf-home}}         → home URL
	 *   {{mf-template:KEY}}  → template ID (int)
	 *
	 * @param mixed $value Value.
	 * @param array $map   Map.
	 * @return mixed
	 */
	public function resolve_tokens( $value, $map ) {
		if ( is_array( $value ) ) {
			foreach ( $value as $k => $v ) {
				$value[ $k ] = $this->resolve_tokens( $v, $map );
			}
			return $value;
		}
		if ( ! is_string( $value ) || false === strpos( $value, '{{mf-' ) ) {
			return $value;
		}
		if ( preg_match( '/^\{\{mf-media:([a-z0-9]+):id\}\}$/', $value, $mm ) ) {
			return isset( $map['media'][ $mm[1] ] ) ? (int) $map['media'][ $mm[1] ] : '';
		}
		if ( preg_match( '/^\{\{mf-template:([a-z0-9_-]+)\}\}$/', $value, $mm ) ) {
			return isset( $map['templates'][ $mm[1] ] ) ? (int) $map['templates'][ $mm[1] ] : '';
		}
		return preg_replace_callback(
			'/\{\{mf-(media|page|home)(?::([a-z0-9_-]+))?(?::(url|id))?\}\}/',
			function ( $mm ) use ( $map ) {
				if ( 'home' === $mm[1] ) {
					return untrailingslashit( home_url() );
				}
				if ( 'page' === $mm[1] ) {
					return isset( $map['pages'][ $mm[2] ] ) ? get_permalink( $map['pages'][ $mm[2] ] ) : home_url( '/' . $mm[2] . '/' );
				}
				$id = $map['media'][ $mm[2] ] ?? 0;
				if ( ! $id ) {
					return '';
				}
				return 'id' === ( $mm[3] ?? 'url' ) ? (string) $id : (string) wp_get_attachment_url( $id );
			},
			$value
		);
	}

	/**
	 * Import status for the admin screen.
	 */
	public function status() {
		$done = get_option( self::DONE );
		return array(
			'imported' => (bool) $done,
			'info'     => $done,
			'source'   => $this->manifest()['source'] ?? 'unknown',
			'counts'   => array(
				'pages'     => count( (array) ( $this->manifest()['pages'] ?? array() ) ),
				'media'     => count( (array) ( $this->manifest()['media'] ?? array() ) ),
				'templates' => count( (array) ( $this->manifest()['templates'] ?? array() ) ),
			),
		);
	}
}

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	/**
	 * `wp modafie import [--step=<step>]` — run the one-click import from the command line.
	 *
	 * @param array $args  Positional.
	 * @param array $assoc Assoc.
	 */
	WP_CLI::add_command(
		'modafie import',
		function ( $args, $assoc ) {
			if ( ! get_current_user_id() ) {
				$admins = get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ids' ) );
				wp_set_current_user( $admins ? (int) $admins[0] : 0 );
			}
			$importer = new Modafie_Importer();
			$steps    = isset( $assoc['step'] ) ? array( $assoc['step'] ) : Modafie_Importer::$steps;
			foreach ( $steps as $step ) {
				$offset = 0;
				do {
					$res = $importer->run( $step, $offset );
					if ( is_wp_error( $res ) ) {
						WP_CLI::error( $step . ': ' . $res->get_error_message() );
					}
					WP_CLI::log( $step . ': ' . $res['message'] );
					foreach ( (array) ( $res['warnings'] ?? array() ) as $w ) {
						WP_CLI::warning( $w );
					}
					$offset = $res['next_offset'] ?? 0;
				} while ( empty( $res['done'] ) );
				if ( 'plugins' === $step && ! did_action( 'elementor/init' ) ) {
					WP_CLI::log( 'Elementor was just activated — run the command again to continue with the remaining steps.' );
					return;
				}
			}
			WP_CLI::success( 'Modafie demo imported.' );
		}
	);
}
