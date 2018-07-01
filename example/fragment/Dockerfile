FROM node:8-slim

WORKDIR /src
COPY .npmrc package.json yarn.lock /src/
RUN yarn install
COPY . /src/

ARG FRAGMENT_NAME
ENV FRAGMENT_NAME $FRAGMENT_NAME
RUN yarn run build

CMD ["node", "node_modules/.bin/remote-modules", "start", "--production"]
