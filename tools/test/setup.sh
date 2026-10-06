#!/usr/bin/env bash
# Fresh WordPress + Modafie theme (from the zip) for end-to-end testing.
#   ELEMENTOR_DIR=/path/to/elementor  → pre-copied (inactive) so the importer can activate it
#                                        offline; without it the importer downloads Elementor
#                                        from WordPress.org.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"
docker compose down -v --remove-orphans >/dev/null 2>&1 || true
docker compose up -d --wait
W="docker compose run --rm -T cli"
$W core install --url=http://localhost:8080 --title="My WordPress Website" --admin_user=admin --admin_password=admin --admin_email=admin@example.com --skip-email
$W option update permalink_structure ''
if [ -n "${ELEMENTOR_DIR:-}" ]; then
  docker cp "$ELEMENTOR_DIR" "$(docker compose ps -q wordpress)":/var/www/html/wp-content/plugins/elementor
  docker compose exec -T wordpress chown -R www-data:www-data /var/www/html/wp-content/plugins/elementor
fi
bash "$ROOT/tools/package-theme.sh"
$W theme install /project/modafie-theme.zip --activate
echo "Ready: http://localhost:8080/wp-admin (admin / admin)"
