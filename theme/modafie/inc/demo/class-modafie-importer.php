<?php
/**
 * One-click demo importer.
 *
 * Reads demo/manifest.json bundled inside the theme and recreates the Modafie site:
 * media → pages (Elementor data) → Elementor templates → menus & settings → Kit → CSS.
 *
 * Every step is idempotent. Objects are tracked by meta keys, so re-running never duplicates
 * media, pages, templates or menus. Pages edited since the last import are left alone
 * unless "reset" is requested.
 *
 * Placeholder tokens inside the Elementor JSON:
 *   {{mf:media-url:KEY}}  attachment URL
 *   {{mf:media-id:KEY}}   attachment ID (the whole string becomes an integer)
 *   {{mf:page-url:SLUG}}  permalink of an imported page
 *   {{mf:home-url}}       home URL
 *   {{mf:admin-post}}     admin-post.php URL (form handler)
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Demo importer.
 */
class Modafie_Importer {

	const META_MEDIA    = '_modafie_demo_key';
	const META_HASH     = '_modafie_demo_hash';
	const META_PAGE     = '_modafie_demo_slug';
	const META_TEMPLATE = '_modafie_demo_template';
	const META_STAMP    = '_modafie_demo_imported';
	const OPTION_STATE  = 'modafie_demo_state';
	const MEDIA_BATCH   = 3;

	/**
	 * Ordered import steps.
	 *
	 * @return array<string, string>
	 */
	public static function steps() {
		return array(
			'plugins'   => __( 'Install & activate Elementor', 'modafie' ),
			'media'     => __( 'Import media library', 'modafie' ),
			'pages'     => __( 'Create pages with Elementor content', 'modafie' ),
			'templates' => __( 'Save reusable Elementor templates', 'modafie' ),
			'menus'     => __( 'Build menus, homepage & theme settings', 'modafie' ),
			'kit'       => __( 'Apply Elementor Kit (global colours & fonts)', 'modafie' ),
			'finalize'  => __( 'Regenerate Elementor CSS', 'modafie' ),
		);
	}

	/**
	 * Demo directory.
	 *
	 * @return string
	 */
	public static function dir() {
		return trailingslashit( MODAFIE_DIR ) . 'demo/';
	}

	/**
	 * Load the manifest.
	 *
	 * @return array|WP_Error
	 */
	public static function manifest() {
		$file = self::dir() . 'manifest.json';
		if ( ! file_exists( $file ) ) {
			return new WP_Error( 'modafie_manifest', __( 'Demo content is missing from the theme (demo/manifest.json).', 'modafie' ) );
		}
		$data = wp_json_file_decode( $file, array( 'associative' => true ) );
		if ( ! is_array( $data ) ) {
			return new WP_Error( 'modafie_manifest', __( 'Demo manifest could not be read.', 'modafie' ) );
		}
		return $data;
	}

	/**
	 * Read a JSON file inside the demo folder (path traversal safe).
	 *
	 * @param string $relative Relative path.
	 * @return array|WP_Error
	 */
	private static function demo_json( $relative ) {
		$path = self::safe_path( $relative );
		if ( is_wp_error( $path ) ) {
			return $path;
		}
		$data = wp_json_file_decode( $path, array( 'associative' => true ) );
		return is_array( $data ) ? $data : new WP_Error( 'modafie_json', sprintf( 'Invalid JSON: %s', $relative ) );
	}

	/**
	 * Resolve a path inside demo/ and refuse anything outside it.
	 *
	 * @param string $relative Relative path.
	 * @return string|WP_Error
	 */
	private static function safe_path( $relative ) {
		$base = realpath( self::dir() );
		$path = realpath( self::dir() . ltrim( (string) $relative, '/' ) );
		if ( ! $base || ! $path || 0 !== strpos( $path, $base . DIRECTORY_SEPARATOR ) || ! is_file( $path ) ) {
			return new WP_Error( 'modafie_path', sprintf( 'Missing demo file: %s', $relative ) );
		}
		return $path;
	}

	/**
	 * Persisted import state (media map, page map, ...).
	 *
	 * @return array
	 */
	private static function state() {
		$state = get_option( self::OPTION_STATE, array() );
		return is_array( $state ) ? wp_parse_args(
			$state,
			array(
				'media'     => array(),
				'pages'     => array(),
				'templates' => array(),
			)
		) : array(
			'media'     => array(),
			'pages'     => array(),
			'templates' => array(),
		);
	}

	/**
	 * Save state.
	 *
	 * @param array $state State.
	 */
	private static function save_state( $state ) {
		update_option( self::OPTION_STATE, $state, false );
	}

	/**
	 * Run one step.
	 *
	 * @param string $step   Step id.
	 * @param int    $offset Offset for batched steps.
	 * @param array  $opts   Options (reset => bool).
	 * @return array|WP_Error {done: bool, offset?: int, message: string, progress?: float}
	 */
	public static function run_step( $step, $offset = 0, $opts = array() ) {
		$manifest = self::manifest();
		if ( is_wp_error( $manifest ) ) {
			return $manifest;
		}
		if ( function_exists( 'set_time_limit' ) ) {
			set_time_limit( 300 ); // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged -- long-running import step.
		}
		wp_raise_memory_limit( 'admin' );

		switch ( $step ) {
			case 'plugins':
				$r = Modafie_Plugin_Installer::ensure_active( 'elementor' );
				return is_wp_error( $r ) ? $r : array(
					'done'    => true,
					'message' => __( 'Elementor is active.', 'modafie' ),
				);
			case 'media':
				return self::import_media( $manifest, (int) $offset );
			case 'pages':
				return self::import_pages( $manifest, ! empty( $opts['reset'] ) );
			case 'templates':
				return self::import_templates( $manifest, ! empty( $opts['reset'] ) );
			case 'menus':
				return self::import_menus_and_settings( $manifest );
			case 'kit':
				return self::import_kit( $manifest );
			case 'finalize':
				return self::finalize( $manifest );
		}
		return new WP_Error( 'modafie_step', 'Unknown step' );
	}

	/* ------------------------------------------------------------------ media */

	/**
	 * Import a batch of media files.
	 *
	 * @param array $manifest Manifest.
	 * @param int   $offset   Offset.
	 * @return array|WP_Error
	 */
	private static function import_media( $manifest, $offset ) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$items = isset( $manifest['media'] ) ? array_values( $manifest['media'] ) : array();
		$state = self::state();
		$total = count( $items );
		$batch = array_slice( $items, $offset, self::MEDIA_BATCH );
		$log   = array();

		foreach ( $batch as $item ) {
			$key  = sanitize_file_name( $item['key'] );
			$path = self::safe_path( $item['file'] );
			if ( is_wp_error( $path ) ) {
				$log[] = $path->get_error_message();
				continue;
			}
			$hash     = md5_file( $path );
			$existing = self::find_attachment( $key );
			if ( $existing && get_post_meta( $existing, self::META_HASH, true ) === $hash && get_attached_file( $existing ) && file_exists( get_attached_file( $existing ) ) ) {
				$state['media'][ $key ] = $existing; // Unchanged: reuse.
				continue;
			}

			$tmp = wp_tempnam( $key );
			if ( ! $tmp || ! copy( $path, $tmp ) ) {
				$log[] = 'Could not copy ' . $key;
				continue;
			}
			$file_array = array(
				'name'     => $key,
				'tmp_name' => $tmp,
			);
			$title      = isset( $item['title'] ) ? $item['title'] : pathinfo( $key, PATHINFO_FILENAME );
			$id         = media_handle_sideload( $file_array, 0, $title );
			if ( is_wp_error( $id ) ) {
				wp_delete_file( $tmp );
				$log[] = $key . ': ' . $id->get_error_message();
				continue;
			}
			if ( $existing ) {
				// Content changed: replace the old attachment so URLs stay unique.
				wp_delete_attachment( $existing, true );
			}
			update_post_meta( $id, self::META_MEDIA, $key );
			update_post_meta( $id, self::META_HASH, $hash );
			if ( ! empty( $item['alt'] ) ) {
				update_post_meta( $id, '_wp_attachment_image_alt', sanitize_text_field( $item['alt'] ) );
			}
			if ( ! empty( $item['caption'] ) ) {
				wp_update_post(
					array(
						'ID'           => $id,
						'post_excerpt' => sanitize_text_field( $item['caption'] ),
					)
				);
			}
			$state['media'][ $key ] = (int) $id;
		}

		self::save_state( $state );
		$next = $offset + count( $batch );
		return array(
			'done'     => $next >= $total,
			'offset'   => $next,
			'progress' => $total ? $next / $total : 1,
			/* translators: 1: done count, 2: total. */
			'message'  => sprintf( __( '%1$d of %2$d files', 'modafie' ), min( $next, $total ), $total ),
			'log'      => $log,
		);
	}

	/**
	 * Find a previously imported attachment.
	 *
	 * @param string $key Demo media key.
	 * @return int
	 */
	private static function find_attachment( $key ) {
		$ids = get_posts(
			array(
				'post_type'      => 'attachment',
				'post_status'    => 'inherit',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'meta_key'       => self::META_MEDIA, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => $key, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			)
		);
		return $ids ? (int) $ids[0] : 0;
	}

	/**
	 * Find a post by demo meta.
	 *
	 * @param string $post_type Post type.
	 * @param string $meta_key  Meta key.
	 * @param string $value     Value.
	 * @return int
	 */
	private static function find_post( $post_type, $meta_key, $value ) {
		$ids = get_posts(
			array(
				'post_type'      => $post_type,
				'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'meta_key'       => $meta_key, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => $value, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			)
		);
		return $ids ? (int) $ids[0] : 0;
	}

	/* ------------------------------------------------------------ token swap */

	/**
	 * Replace placeholder tokens recursively.
	 *
	 * @param mixed $data  Data.
	 * @param array $state Import state.
	 * @return mixed
	 */
	private static function replace_tokens( $data, $state ) {
		if ( is_array( $data ) ) {
			foreach ( $data as $k => $v ) {
				$data[ $k ] = self::replace_tokens( $v, $state );
			}
			return $data;
		}
		if ( ! is_string( $data ) || false === strpos( $data, '{{mf:' ) ) {
			return $data;
		}
		if ( preg_match( '/^\{\{mf:media-id:([^}]+)\}\}$/', $data, $m ) ) {
			return isset( $state['media'][ $m[1] ] ) ? (int) $state['media'][ $m[1] ] : '';
		}
		return preg_replace_callback(
			'/\{\{mf:([a-z-]+)(?::([^}]+))?\}\}/',
			static function ( $m ) use ( $state ) {
				$arg = isset( $m[2] ) ? $m[2] : '';
				switch ( $m[1] ) {
					case 'media-url':
						return isset( $state['media'][ $arg ] ) ? (string) wp_get_attachment_url( $state['media'][ $arg ] ) : '';
					case 'media-id':
						return isset( $state['media'][ $arg ] ) ? (string) $state['media'][ $arg ] : '';
					case 'page-url':
						return isset( $state['pages'][ $arg ] ) ? (string) get_permalink( $state['pages'][ $arg ] ) : home_url( '/' . $arg . '/' );
					case 'home-url':
						return home_url( '/' );
					case 'admin-post':
						return admin_url( 'admin-post.php' );
				}
				return '';
			},
			$data
		);
	}

	/**
	 * Save Elementor data for a post using Elementor's own document API (falls back to meta).
	 *
	 * @param int    $post_id  Post ID.
	 * @param array  $elements Elements.
	 * @param array  $settings Page settings.
	 * @param string $type     Elementor template type.
	 */
	private static function save_elementor( $post_id, $elements, $settings, $type ) {
		update_post_meta( $post_id, '_elementor_edit_mode', 'builder' );
		update_post_meta( $post_id, '_elementor_template_type', $type );

		if ( did_action( 'elementor/loaded' ) ) {
			$document = \Elementor\Plugin::instance()->documents->get( $post_id, false );
			if ( $document ) {
				$document->save(
					array(
						'elements' => $elements,
						'settings' => $settings,
					)
				);
				delete_post_meta( $post_id, '_elementor_css' );
				return;
			}
		}
		update_post_meta( $post_id, '_elementor_data', wp_slash( wp_json_encode( $elements ) ) );
		update_post_meta( $post_id, '_elementor_page_settings', $settings );
		if ( defined( 'ELEMENTOR_VERSION' ) ) {
			update_post_meta( $post_id, '_elementor_version', ELEMENTOR_VERSION );
		}
	}

	/**
	 * Has the user edited this post since we imported it?
	 *
	 * @param int $post_id Post.
	 * @return bool
	 */
	private static function user_modified( $post_id ) {
		$stamp = (int) get_post_meta( $post_id, self::META_STAMP, true );
		return $stamp && ( (int) get_post_modified_time( 'U', true, $post_id ) > $stamp + 5 );
	}

	/* ------------------------------------------------------------------ pages */

	/**
	 * Create/update all pages.
	 *
	 * @param array $manifest Manifest.
	 * @param bool  $reset    Overwrite pages the user edited.
	 * @return array|WP_Error
	 */
	private static function import_pages( $manifest, $reset ) {
		$state = self::state();
		$pages = isset( $manifest['pages'] ) ? $manifest['pages'] : array();
		$log   = array();

		// Pass 1: make sure every page exists so cross-links resolve.
		foreach ( $pages as $page ) {
			$slug = sanitize_title( $page['slug'] );
			$id   = self::find_post( 'page', self::META_PAGE, $slug );
			if ( ! $id ) {
				$id = wp_insert_post(
					array(
						'post_type'   => 'page',
						'post_status' => 'publish',
						'post_title'  => sanitize_text_field( $page['title'] ),
						'post_name'   => $slug,
						'menu_order'  => isset( $page['menu_order'] ) ? (int) $page['menu_order'] : 0,
					),
					true
				);
				if ( is_wp_error( $id ) ) {
					return $id;
				}
				update_post_meta( $id, self::META_PAGE, $slug );
			}
			$state['pages'][ $slug ] = (int) $id;
		}
		// Parents.
		foreach ( $pages as $page ) {
			$child_id = $state['pages'][ sanitize_title( $page['slug'] ) ];
			if ( ! empty( $page['parent'] ) && isset( $state['pages'][ $page['parent'] ] ) && (int) get_post_field( 'post_parent', $child_id ) !== (int) $state['pages'][ $page['parent'] ] ) {
				wp_update_post(
					array(
						'ID'          => $state['pages'][ sanitize_title( $page['slug'] ) ],
						'post_parent' => $state['pages'][ $page['parent'] ],
					)
				);
			}
		}
		self::save_state( $state );

		// Pass 2: content.
		$count = 0;
		foreach ( $pages as $page ) {
			$slug = sanitize_title( $page['slug'] );
			$id   = $state['pages'][ $slug ];
			if ( ! $reset && self::user_modified( $id ) ) {
				/* translators: %s: page title. */
				$log[] = sprintf( __( 'Kept your edits on “%s”.', 'modafie' ), get_the_title( $id ) );
				continue;
			}
			$elements = self::demo_json( $page['file'] );
			if ( is_wp_error( $elements ) ) {
				return $elements;
			}
			$elements = self::replace_tokens( $elements, $state );
			$settings = self::replace_tokens( isset( $page['settings'] ) ? $page['settings'] : array(), $state );

			wp_update_post(
				array(
					'ID'           => $id,
					'post_title'   => sanitize_text_field( $page['title'] ),
					'post_excerpt' => isset( $page['description'] ) ? sanitize_text_field( $page['description'] ) : '',
					'post_content' => isset( $page['fallback_html'] ) ? wp_kses_post( self::replace_tokens( $page['fallback_html'], $state ) ) : '',
					'post_status'  => 'publish',
				)
			);
			update_post_meta( $id, '_wp_page_template', isset( $page['template'] ) ? sanitize_text_field( $page['template'] ) : 'elementor_header_footer' );
			self::save_elementor( $id, $elements, $settings, 'wp-page' );
			if ( ! empty( $page['description'] ) ) {
				update_post_meta( $id, '_modafie_meta_description', sanitize_text_field( $page['description'] ) );
			}
			if ( ! empty( $page['thumbnail'] ) && isset( $state['media'][ $page['thumbnail'] ] ) ) {
				set_post_thumbnail( $id, $state['media'][ $page['thumbnail'] ] );
			}
			clean_post_cache( $id );
			update_post_meta( $id, self::META_STAMP, time() );
			++$count;
		}

		return array(
			'done'    => true,
			/* translators: %d: number of pages. */
			'message' => sprintf( _n( '%d page imported', '%d pages imported', $count, 'modafie' ), $count ),
			'log'     => $log,
		);
	}

	/* -------------------------------------------------------------- templates */

	/**
	 * Save every section as a reusable Elementor template.
	 *
	 * @param array $manifest Manifest.
	 * @param bool  $reset    Overwrite edited templates.
	 * @return array|WP_Error
	 */
	private static function import_templates( $manifest, $reset ) {
		$state     = self::state();
		$templates = isset( $manifest['templates'] ) ? $manifest['templates'] : array();
		$count     = 0;
		foreach ( $templates as $tpl ) {
			$key = sanitize_key( $tpl['key'] );
			$id  = self::find_post( 'elementor_library', self::META_TEMPLATE, $key );
			if ( ! $id ) {
				$id = wp_insert_post(
					array(
						'post_type'   => 'elementor_library',
						'post_status' => 'publish',
						'post_title'  => sanitize_text_field( $tpl['title'] ),
					),
					true
				);
				if ( is_wp_error( $id ) ) {
					return $id;
				}
				update_post_meta( $id, self::META_TEMPLATE, $key );
			} elseif ( ! $reset && self::user_modified( $id ) ) {
				$state['templates'][ $key ] = (int) $id;
				continue;
			}
			$type = isset( $tpl['type'] ) ? sanitize_key( $tpl['type'] ) : 'container';
			wp_set_object_terms( $id, $type, 'elementor_library_type' );
			if ( ! empty( $tpl['category'] ) ) {
				wp_set_object_terms( $id, sanitize_text_field( $tpl['category'] ), 'elementor_library_category' );
			}
			$elements = self::demo_json( $tpl['file'] );
			if ( is_wp_error( $elements ) ) {
				return $elements;
			}
			self::save_elementor( $id, self::replace_tokens( $elements, $state ), array(), $type );
			update_post_meta( $id, self::META_STAMP, time() );
			$state['templates'][ $key ] = (int) $id;
			++$count;
		}
		self::save_state( $state );
		return array(
			'done'    => true,
			/* translators: %d: number of templates. */
			'message' => sprintf( _n( '%d template saved', '%d templates saved', $count, 'modafie' ), $count ),
		);
	}

	/* ------------------------------------------------------ menus & settings */

	/**
	 * Menus, front page, site options, Customizer settings.
	 *
	 * @param array $manifest Manifest.
	 * @return array|WP_Error
	 */
	private static function import_menus_and_settings( $manifest ) {
		$state     = self::state();
		$locations = get_theme_mod( 'nav_menu_locations', array() );

		foreach ( isset( $manifest['menus'] ) ? $manifest['menus'] : array() as $menu ) {
			$obj     = wp_get_nav_menu_object( $menu['name'] );
			$menu_id = $obj ? (int) $obj->term_id : wp_create_nav_menu( $menu['name'] );
			if ( is_wp_error( $menu_id ) ) {
				return $menu_id;
			}
			// Rebuild items (idempotent).
			foreach ( (array) wp_get_nav_menu_items( $menu_id, array( 'post_status' => 'any' ) ) as $item ) {
				wp_delete_post( $item->ID, true );
			}
			self::add_menu_items( $menu_id, $menu['items'], 0, $state );
			if ( ! empty( $menu['location'] ) ) {
				$locations[ $menu['location'] ] = $menu_id;
			}
		}
		set_theme_mod( 'nav_menu_locations', $locations );

		// Front page.
		foreach ( isset( $manifest['pages'] ) ? $manifest['pages'] : array() as $page ) {
			$slug = sanitize_title( $page['slug'] );
			if ( ! empty( $page['front'] ) && isset( $state['pages'][ $slug ] ) ) {
				update_option( 'show_on_front', 'page' );
				update_option( 'page_on_front', $state['pages'][ $slug ] );
			}
			if ( ! empty( $page['posts'] ) && isset( $state['pages'][ $slug ] ) ) {
				update_option( 'page_for_posts', $state['pages'][ $slug ] );
			}
		}

		// Site identity.
		$site = isset( $manifest['site'] ) ? $manifest['site'] : array();
		if ( ! empty( $site['blogname'] ) && in_array( get_option( 'blogname' ), array( '', 'My WordPress Website', 'WordPress', 'My Blog' ), true ) ) {
			update_option( 'blogname', sanitize_text_field( $site['blogname'] ) );
		}
		if ( ! empty( $site['blogdescription'] ) && in_array( get_option( 'blogdescription' ), array( '', 'Just another WordPress site' ), true ) ) {
			update_option( 'blogdescription', sanitize_text_field( $site['blogdescription'] ) );
		}
		if ( ! empty( $site['logo'] ) && isset( $state['media'][ $site['logo'] ] ) ) {
			set_theme_mod( 'custom_logo', $state['media'][ $site['logo'] ] );
		}
		if ( ! empty( $site['icon'] ) && isset( $state['media'][ $site['icon'] ] ) ) {
			update_option( 'site_icon', $state['media'][ $site['icon'] ] );
		}
		if ( '' === (string) get_option( 'permalink_structure' ) ) {
			update_option( 'permalink_structure', '/%postname%/' );
		}

		// Theme Customizer settings (only this theme's keys).
		foreach ( isset( $manifest['customizer'] ) ? $manifest['customizer'] : array() as $key => $value ) {
			if ( 0 === strpos( $key, 'modafie_' ) ) {
				set_theme_mod( $key, is_string( $value ) ? sanitize_textarea_field( $value ) : $value );
			}
		}
		foreach ( array( 'header', 'footer' ) as $part ) {
			$tkey = isset( $manifest[ $part . '_template' ] ) ? sanitize_key( $manifest[ $part . '_template' ] ) : '';
			if ( $tkey && isset( $state['templates'][ $tkey ] ) ) {
				set_theme_mod( 'modafie_' . $part . '_template', (int) $state['templates'][ $tkey ] );
			}
		}

		return array(
			'done'    => true,
			'message' => __( 'Menus, homepage and settings applied.', 'modafie' ),
		);
	}

	/**
	 * Recursively add menu items.
	 *
	 * @param int   $menu_id Menu.
	 * @param array $items   Items.
	 * @param int   $parent  Parent item.
	 * @param array $state   State.
	 */
	private static function add_menu_items( $menu_id, $items, $parent, $state ) {
		$position = 0;
		foreach ( $items as $item ) {
			$args = array(
				'menu-item-title'       => sanitize_text_field( $item['title'] ),
				'menu-item-status'      => 'publish',
				'menu-item-parent-id'   => $parent,
				'menu-item-position'    => ++$position,
				'menu-item-classes'     => isset( $item['classes'] ) ? sanitize_text_field( $item['classes'] ) : '',
				'menu-item-description' => isset( $item['description'] ) ? self::replace_tokens( $item['description'], $state ) : '',
			);
			if ( ! empty( $item['page'] ) && isset( $state['pages'][ $item['page'] ] ) ) {
				$args['menu-item-object-id'] = $state['pages'][ $item['page'] ];
				$args['menu-item-object']    = 'page';
				$args['menu-item-type']      = 'post_type';
			} else {
				$args['menu-item-url']  = esc_url_raw( self::replace_tokens( isset( $item['url'] ) ? $item['url'] : '#', $state ) );
				$args['menu-item-type'] = 'custom';
			}
			$id = wp_update_nav_menu_item( $menu_id, 0, $args );
			if ( ! is_wp_error( $id ) && ! empty( $item['children'] ) ) {
				self::add_menu_items( $menu_id, $item['children'], $id, $state );
			}
		}
	}

	/* -------------------------------------------------------------------- kit */

	/**
	 * Apply Elementor Kit settings (global colours, fonts, theme style, layout).
	 *
	 * @param array $manifest Manifest.
	 * @return array|WP_Error
	 */
	private static function import_kit( $manifest ) {
		if ( ! did_action( 'elementor/loaded' ) ) {
			return new WP_Error( 'modafie_elementor', __( 'Elementor is not active.', 'modafie' ) );
		}
		$kit_settings = self::demo_json( isset( $manifest['kit'] ) ? $manifest['kit'] : 'kit.json' );
		if ( is_wp_error( $kit_settings ) ) {
			return $kit_settings;
		}
		$state        = self::state();
		$kit_settings = self::replace_tokens( $kit_settings, $state );

		$plugin = \Elementor\Plugin::instance();
		$kit    = $plugin->kits_manager->get_active_kit();
		if ( ! $kit || ! $kit->get_id() ) {
			$kit_id = $plugin->kits_manager->create_default();
			update_option( \Elementor\Core\Kits\Manager::OPTION_ACTIVE, $kit_id );
			$kit = $plugin->kits_manager->get_kit( $kit_id );
		}
		$current = $kit->get_settings();
		$current = is_array( $current ) ? $current : array();
		$kit->save( array( 'settings' => array_merge( $current, $kit_settings ) ) );

		// Let the Kit own colours & fonts; Elementor defaults would otherwise override them.
		update_option( 'elementor_disable_color_schemes', 'yes' );
		update_option( 'elementor_disable_typography_schemes', 'yes' );
		update_option( 'elementor_font_display', 'swap' );
		update_option( 'elementor_google_font', '0' );
		// Inline the (small) Kit + page CSS: fewer render-blocking requests, better mobile LCP.
		update_option( 'elementor_css_print_method', 'internal' );
		$cpt = get_option( 'elementor_cpt_support', array( 'page', 'post' ) );
		update_option( 'elementor_cpt_support', array_values( array_unique( array_merge( (array) $cpt, array( 'page', 'post' ) ) ) ) );

		return array(
			'done'    => true,
			'message' => __( 'Global colours, fonts and layout applied.', 'modafie' ),
		);
	}

	/* --------------------------------------------------------------- finalize */

	/**
	 * Clear Elementor CSS so it regenerates with the new Kit, flush permalinks.
	 *
	 * @param array $manifest Manifest.
	 * @return array
	 */
	private static function finalize( $manifest ) {
		if ( did_action( 'elementor/loaded' ) ) {
			\Elementor\Plugin::instance()->files_manager->clear_cache();
		}
		flush_rewrite_rules( true );
		update_option(
			'modafie_demo_imported',
			array(
				'time'    => time(),
				'version' => isset( $manifest['version'] ) ? $manifest['version'] : '',
				'source'  => isset( $manifest['source'] ) ? $manifest['source'] : '',
			),
			false
		);
		delete_option( 'modafie_show_setup_notice' );
		$state = self::state();
		$front = isset( $state['pages'] ) && $state['pages'] ? get_option( 'page_on_front' ) : 0;
		return array(
			'done'    => true,
			'message' => __( 'All done!', 'modafie' ),
			'view'    => $front ? get_permalink( $front ) : home_url( '/' ),
			'edit'    => $front && did_action( 'elementor/loaded' ) ? admin_url( 'post.php?post=' . (int) $front . '&action=elementor' ) : '',
		);
	}
}
