FROM node:10-slim

WORKDIR /src
COPY .npmrc package.json yarn.lock /src/
RUN yarn install
COPY . /src/
RUN yarn run build

CMD ["node", "."]
