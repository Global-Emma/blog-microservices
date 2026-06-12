# using the official node.js version 18 image with alpine linux

FROM node:24-alpine
WORKDIR /app

COPY . .

RUN npm install --omit=dev

CMD ["node", "server.js"]

EXPOSE 7000