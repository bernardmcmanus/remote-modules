FROM node:8

WORKDIR /src
COPY .npmrc package.json /src/
COPY . /src/
RUN npm install
RUN npm run build

SHELL ["/bin/bash", "-c"]
RUN shopt -s extglob; GLOBIGNORE=.:..; eval 'rm -rf -- !(dist|package.json|README.md)'
RUN ln -s `npm pack` remote-module.tgz

CMD ["/bin/bash", "-c", "exit 0"]
