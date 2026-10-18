#!/bin/sh
set -eu

# Test artifacts live in volumes so existing host artifacts remain untouched.
for artifact in console screenshots source; do
    mkdir -p "$APP_BASE_DIR/tests/Browser/$artifact"
    chown www-data:www-data "$APP_BASE_DIR/tests/Browser/$artifact"
done

if [ ! -f "$APP_BASE_DIR/.env" ]; then
    cp "$APP_BASE_DIR/.env.example" "$APP_BASE_DIR/.env"
    chown www-data:www-data "$APP_BASE_DIR/.env"
fi

su -s /bin/sh www-data -c "cd $APP_BASE_DIR && composer install --no-interaction"

if [ ! -d "$APP_BASE_DIR/node_modules" ]; then
    su -s /bin/sh www-data -c "cd $APP_BASE_DIR && npm install --no-audit --no-fund --package-lock=false"
fi

su -s /bin/sh www-data -c "cd $APP_BASE_DIR && npm run build"

mkdir -p "$APP_BASE_DIR/database"
database_file="${DB_DATABASE:-$APP_BASE_DIR/database/database.sqlite}"
touch "$database_file"
chown www-data:www-data "$database_file"
su -s /bin/sh www-data -c "cd $APP_BASE_DIR && php artisan migrate --force --no-interaction"
