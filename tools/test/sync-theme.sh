#!/usr/bin/env bash
# Dev helper: copy theme/modafie into the running test container (skips re-zipping).
set -euo pipefail
cd "$(dirname "$0")"
CID=$(docker compose ps -q wordpress)
tar -C ../../theme -cf - modafie | docker exec -i "$CID" sh -c "rm -rf /var/www/html/wp-content/themes/modafie && tar -C /var/www/html/wp-content/themes -xf - && chown -R www-data:www-data /var/www/html/wp-content/themes/modafie"
