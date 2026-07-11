FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm i -g tsx
COPY src ./src
COPY tsconfig.json ./
USER node
EXPOSE 3000
CMD ["tsx", "src/server.ts"]
