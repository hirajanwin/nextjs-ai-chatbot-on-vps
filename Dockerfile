FROM node:20-alpine AS base

# Disabling Telemetry
ENV NEXT_TELEMETRY_DISABLED 1
RUN apk add --no-cache libc6-compat curl python3 py3-pip

RUN npm install pnpm -g

FROM base AS deps
WORKDIR /app

# add env vars as config/deploy.yml is not working
RUN echo "OPENAI_API_KEY=\"$OPENAI_API_KEY\"" > ./env
RUN echo "AUTH_SECRET=\"$AUTH_SECRET\"" >> ./env

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next
RUN mkdir -p /ai-chatbot-data && chown -R nextjs:nodejs /ai-chatbot-data
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV NODE_ENV=production

CMD ["node", "server.js"]