FROM remote-modules/base as base
FROM node:8-slim

WORKDIR /src
COPY --from=base /src/remote-modules.tgz /
COPY .npmrc package.json /src/
RUN yarn install
COPY . /src/

ARG FRAGMENT_NAME
ENV FRAGMENT_NAME $FRAGMENT_NAME
RUN yarn run build

CMD ["node", "node_modules/.bin/remote-modules", "start", "--production"]
