#!/bin/sh
set -e

# Substitute environment variables in nginx config template
envsubst '${BACKEND_SERVICE_NAME}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'

