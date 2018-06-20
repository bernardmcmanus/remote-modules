FROM node:8-slim

WORKDIR /src
COPY .npmrc package.json /src/
COPY . /src/
RUN yarn install
RUN yarn run build

SHELL ["/bin/bash", "-c"]
RUN shopt -s extglob; GLOBIGNORE=.:..; eval 'rm -rf -- !(dist|package.json|README.md)'
RUN ln -s `yarn pack | grep -oe 'remote-modules-.\+\.tgz'` remote-modules.tgz

CMD ["/bin/bash", "-c", "exit 0"]
