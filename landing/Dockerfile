# Public trinqa.com landing: a static Next.js export served by nginx (non-root, :8080).
# Built with this directory as the context (Outplane root directory: /landing).
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx . /usr/share/nginx/html
EXPOSE 8080
