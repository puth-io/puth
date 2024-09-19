#!/bin/bash

# Usage: laravel-fresh-sh {laravel version} {phpunit version} {collision version}
# Example: laravel-fresh-sh 11 11 8

docker container rm puth-local-fresh-laravel || true
docker run -dit --name=puth-local-fresh-laravel --network host --workdir=/var/www/html/php/workspaces/laravel/ laravelphp/vapor:php82 ash
docker container cp workspaces/clients/php/ puth-local-fresh-laravel:/var/www/html
docker container exec puth-local-fresh-laravel ash -c "chown -R root:root /var/www/html"
docker container exec puth-local-fresh-laravel ash -c "wget https://raw.githubusercontent.com/composer/getcomposer.org/76a7060ccb93902cd7576b67264ad91c8a2700e2/web/installer -O - -q | php -- --quiet && chmod 755 composer.phar && mv composer.phar /usr/local/bin/composer"
docker container exec puth-local-fresh-laravel ash -c "composer require \"laravel/framework:$1.*\" --no-interaction --no-update && composer require \"phpunit/phpunit:$2.*\" --no-interaction --no-update --dev && composer require \"nunomaduro/collision:$3.*\" --no-interaction --no-update --dev && composer update --prefer-stable --no-interaction --no-suggest"
docker container attach --sig-proxy=false puth-local-fresh-laravel
