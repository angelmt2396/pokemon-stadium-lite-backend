FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY src ./src
COPY docs ./docs

EXPOSE 3000

CMD ["npm", "start"]
