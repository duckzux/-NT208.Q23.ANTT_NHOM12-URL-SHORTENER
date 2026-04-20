FROM php:8.1-apache

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Copy Apache virtual host config
COPY apache.conf /etc/apache2/sites-available/000-default.conf

# Copy project files
COPY ./backend  /var/www/html/backend
COPY ./frontend /var/www/html/frontend
COPY .env       /var/www/html/.env

EXPOSE 80
