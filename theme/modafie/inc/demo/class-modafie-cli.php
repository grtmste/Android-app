<?php
/**
 * WP-CLI: `wp modafie import [--reset]` runs the same one-click import from the command line.
 *
 * @package Modafie
 */

defined( 'ABSPATH' ) || exit;

/**
 * Modafie theme commands.
 */
class Modafie_CLI {

	/**
	 * Import the bundled Modafie demo content (idempotent).
	 *
	 * ## OPTIONS
	 *
	 * [--reset]
	 * : Also overwrite pages/templates edited since the last import.
	 *
	 * ## EXAMPLES
	 *
	 *     wp modafie import --user=admin
	 *
	 * @param array $args       Positional args.
	 * @param array $assoc_args Flags.
	 */
	public function import( $args, $assoc_args ) {
		if ( ! get_current_user_id() ) {
			WP_CLI::error( 'Run as an administrator, e.g. --user=admin' );
		}
		foreach ( array_keys( Modafie_Importer::steps() ) as $step ) {
			$offset = 0;
			do {
				$result = Modafie_Importer::run_step( $step, $offset, array( 'reset' => ! empty( $assoc_args['reset'] ) ) );
				if ( is_wp_error( $result ) ) {
					WP_CLI::error( $step . ': ' . $result->get_error_message() );
				}
				foreach ( isset( $result['log'] ) ? (array) $result['log'] : array() as $line ) {
					WP_CLI::log( '  ' . $line );
				}
				$offset = isset( $result['offset'] ) ? (int) $result['offset'] : 0;
			} while ( empty( $result['done'] ) );
			WP_CLI::log( sprintf( '%-10s %s', $step, $result['message'] ) );
		}
		WP_CLI::success( 'Modafie demo content imported.' );
	}
}
WP_CLI::add_command( 'modafie', 'Modafie_CLI' );
