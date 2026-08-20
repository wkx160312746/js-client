FROM nginx:1.27-alpine

LABEL maintainer="js-ratel-client"
LABEL description="Ratel online game browser client"

WORKDIR /usr/share/nginx/html

# Only copy files that must be publicly available. This keeps repository and
# deployment metadata out of the nginx document root.
COPY index.html ws.html modern-terminal.html ./
COPY css ./css
COPY favicons ./favicons
COPY images ./images
COPY js ./js
COPY libs ./libs
COPY protoc ./protoc

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY build.sh /usr/local/bin/start-client
RUN chmod +x /usr/local/bin/start-client

# Zeabur detects this port for Dockerfile-based services. At runtime PORT may
# override it and start-client will render the matching nginx configuration.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-8080}/health" || exit 1

CMD ["/usr/local/bin/start-client"]
