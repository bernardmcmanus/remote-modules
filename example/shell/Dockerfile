FROM remote-module/base as base
FROM node:8-slim

WORKDIR /src
COPY --from=base /src/remote-module.tgz /
COPY .npmrc package.json /src/
RUN yarn install
COPY . /src/
RUN yarn run build

CMD ["node", "."]
