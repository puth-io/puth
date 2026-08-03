#!/bin/sh
set -eu

if [ ! -f "$APP_BASE_DIR/vendor/autoload.php" ]; then
    su -s /bin/sh www-data -c "cd $APP_BASE_DIR && composer update --prefer-stable --no-interaction"
fi

if [ ! -d "$APP_BASE_DIR/node_modules" ]; then
    su -s /bin/sh www-data -c "cd $APP_BASE_DIR && npm install --no-audit --no-fund"
fi

su -s /bin/sh www-data -c "cd $APP_BASE_DIR && npm run build"

mkdir -p "$APP_BASE_DIR/database"
touch "$APP_BASE_DIR/database/database.sqlite"
chown www-data:www-data "$APP_BASE_DIR/database/database.sqlite"
su -s /bin/sh www-data -c "cd $APP_BASE_DIR && php artisan migrate --force --no-interaction"
