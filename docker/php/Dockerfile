
FROM php:8.3-fpm

ARG APP_ENV=development

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    curl \
    libzip-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libicu-dev \
    && docker-php-ext-configure gd \
       --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
       pdo_mysql \
       bcmath \
       gd \
       intl \
       zip \
       opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN if [ "$APP_ENV" = "production" ]; then \
        printf '%s\n' \
          'opcache.validate_timestamps=0' \
          'opcache.revalidate_freq=0' \
          > /usr/local/etc/php/conf.d/99-erpflow-opcache.ini; \
    else \
        printf '%s\n' \
          'opcache.validate_timestamps=1' \
          'opcache.revalidate_freq=0' \
          > /usr/local/etc/php/conf.d/99-erpflow-opcache.ini; \
    fi

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/php/erpflow-backend-entrypoint /usr/local/bin/erpflow-backend-entrypoint
RUN chmod +x /usr/local/bin/erpflow-backend-entrypoint

WORKDIR /var/www/html
