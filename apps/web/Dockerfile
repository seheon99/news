FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat && corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build



FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
