FROM remote-module/base as base
FROM node:8

WORKDIR /src
COPY --from=base /src/remote-module.tgz /
COPY .npmrc package.json /src/
RUN npm install
COPY . /src/

ARG FRAGMENT_NAME
ENV FRAGMENT_NAME $FRAGMENT_NAME
RUN npm run build

CMD ["node", "node_modules/.bin/remote-module", "start", "--production"]
