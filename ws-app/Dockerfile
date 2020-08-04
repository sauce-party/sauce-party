FROM node:current-alpine

WORKDIR /opt/app
COPY . .
RUN npm ci

EXPOSE 80

CMD [ "node", "app.js" ]
