FROM node:24-slim AS node

FROM serversideup/php:8.5-fpm-nginx

ARG USER_ID=1000
ARG GROUP_ID=1000

USER root
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && install-php-extensions pdo_sqlite intl zip \
    && docker-php-serversideup-set-id www-data ${USER_ID}:${GROUP_ID}

COPY --chmod=755 --chown=www-data:www-data docker/dev/laravel-entrypoint.sh /etc/entrypoint.d/20-puth-development.sh

RUN rm -rf /var/www/html \
    && ln -s /workspace/workspaces/clients/php/workspaces/laravel /var/www/html

USER root
WORKDIR /var/www/html
