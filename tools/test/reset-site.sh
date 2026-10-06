#!/usr/bin/env bash
# Recreate a *fresh* WordPress site for testing the theme zip + one-click import.
#   WP_SRC=/path/to/WordPress-checkout ELEMENTOR_SRC=/path/to/elementor-build THEME_CHECK_SRC=... ./reset-site.sh
# Elementor and Theme Check are copied in but left INACTIVE so the importer's
# "install/activate Elementor" step is exercised (wordpress.org is unreachable from the test box).
set -euo pipefail
cd "$(dirname "$0")"
WP="docker compose exec -T cli wp"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d
for i in $(seq 1 60); do $WP db check >/dev/null 2>&1 && break; sleep 2; done
CID=$(docker compose ps -q wordpress)
if [ -n "${WP_SRC:-}" ] && [ -d "$WP_SRC/wp-admin" ]; then
  tar -C "$WP_SRC" --exclude=wp-content --exclude=.git -cf - . | docker exec -i "$CID" tar -C /var/www/html -xf -
fi
$WP core install --url=http://localhost:8080 --title="My WordPress Website" --admin_user=admin --admin_password=admin --admin_email=admin@example.com --skip-email
$WP rewrite structure '/%postname%/' --hard
$WP option update blogdescription ''
for src in "${ELEMENTOR_SRC:-}" "${THEME_CHECK_SRC:-}"; do
  [ -n "$src" ] && [ -d "$src" ] || continue
  name=$(basename "$src"); [ "$name" = build ] && name=elementor
  tar -C "$src" --exclude=.git --exclude=node_modules -cf - . | docker exec -i "$CID" sh -c "mkdir -p /var/www/html/wp-content/plugins/$name && tar -C /var/www/html/wp-content/plugins/$name -xf -"
done
docker exec "$CID" chown -R www-data:www-data /var/www/html/wp-content
$WP core version
$WP plugin list
