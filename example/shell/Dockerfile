FROM remote-module/base as base
FROM node:8

WORKDIR /src
COPY --from=base /src/remote-module.tgz /
COPY .npmrc package.json /src/
RUN npm install
COPY . /src/
RUN npm run build

CMD ["node", "."]
