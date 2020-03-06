FROM node:10-alpine AS base
WORKDIR /usr/src/opentitles
COPY package*.json ./

# Get the latest definition file from GitHub
FROM base as definition
RUN apk add --no-cache git=2.22.2-r0 \
    --repository https://alpine.global.ssl.fastly.net/alpine/v3.10/community \
    --repository https://alpine.global.ssl.fastly.net/alpine/v3.10/main
RUN git clone https://github.com/Fdebijl/OpenTitles.Definition.git defs

# Builder image used only for compiling Typescript files
# Should also run unit tests and linting in the future
FROM base as builder
RUN npm ci
COPY . .
RUN npm run compile

# Lean production image that just contains the dist directory and runtime dependencies
FROM base as prod
RUN npm ci --only=production
COPY --from=builder /usr/src/opentitles/dist .
COPY --from=definition /usr/src/opentitles/defs/media.json .
ENV NODE_ENV=production

# Setup cronjob to run crawler
RUN mkdir -p /etc/cron.d
COPY opentitles-cron /etc/cron.d/opentitles-cron
RUN chmod 0644 /etc/cron.d/opentitles-cron
RUN crontab /etc/cron.d/opentitles-cron

# Create the log files to be able to run tail
RUN touch /var/log/cron.log
RUN touch /usr/src/opentitles/crawler.log
CMD crond && tail -f /var/log/cron.log
