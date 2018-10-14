<a href="./README.md">
  <img width="120" height="120" src="./docs/remote-modules.svg" align="right">
</a>

# Remote Modules
> A module manager for distributed applications</br></br>
> [![nodejs](https://img.shields.io/badge/node-%3E=8.0.0-brightgreen.svg "nodejs")](https://nodejs.org/)
> [![travis-ci](https://travis-ci.org/bernardmcmanus/remote-modules.svg?branch=master)](https://travis-ci.org/bernardmcmanus/remote-modules)

# Contents
<!-- AUTO-GENERATED AT COMMIT. DO NOT EDIT -->

<!-- toc -->

- [Installation](#installation)
- [Introduction](#introduction)
  * [Why Remote Modules?](#why-remote-modules)
  * [Stability and Security](#stability-and-security)
- [API Documentation](#api-documentation)
- [Example App](#example-app)
- [Getting Started](#getting-started)
- [Key Features and Concepts](#key-features-and-concepts)
  * [Hot Swapping](#hot-swapping)
  * [Static Evaluation](#static-evaluation)
  * [Scope](#scope)
  * [Request Attributes](#request-attributes)
- [FAQ](#faq)

<!-- tocstop -->

# Installation

<sup>__NOTE:__ `remote-modules` should be installed as a dependency.</sup>

Install with yarn:

```
yarn add remote-modules
```

Install with npm:

```
npm install remote-modules
```

# Introduction

remote-modules is a full service JavaScript module manager. It's universal, so it will run both in browser and on server. It's comprised of several components that are used to compile, serve, fetch, and execute modules dynamically, on demand, over HTTP, _even server-side_.

Remember, __never use remote-modules to load untrusted code.__ It's poor form, and even in a sandbox it can have terrible consequences, especially on your server. Just don't do it.

## Why Remote Modules?

UI frameworks come in all shapes and sizes, but they all have one common dependency: __context__. This makes perfect sense considering browsers are designed to load and execute JavaScript on demand, but it also means UI apps that make use of SSR (server-side rendering) are hopelessly monolithic. To be sure, there are many ways to break things up - you can publish shared components or even entire pages as packages that are installed by the shell, but at the end of the day, even the smallest change means a full deploy.

remote-modules empowers you to build truly distributed, independently deployable applications. Its relevance extends far beyond the UI - any component or plugin based application is a great candidate. We'd love to hear how you're using remote-modules to solve your most frustrating architecture problems.

## Stability and Security

remote-modules is still in the very early stages of development, which means there will be big changes coming as we gather feedback and work to stabilize the API. We don't plan on making any breaking changes or adding significant features before the first major release, except for low-hanging fruit or some of the larger pain points. Bugs and vulnerabilities will be patched as they arise, and releases will adhere to semver rules.

<h4>Stability Designations</h4>

Rank | Description
---- | -----------
[![Deprecated](http://badges.github.io/stability-badges/dist/deprecated.svg "Deprecated")](http://github.com/badges/stability-badges) | Don't use this feature - it's no longer supported and will likely be removed
[![Experimental](http://badges.github.io/stability-badges/dist/experimental.svg "Experimental")](http://github.com/badges/stability-badges) | There may be fundamental changes to this feature
[![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable")](http://github.com/badges/stability-badges) | There may be breaking changes to this feature
[![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable")](http://github.com/badges/stability-badges) | There may be backward compatible changes to this feature

# API Documentation

- [CLI](./src/cli)
- [Client](./src/client)
- [Server](./src/server)

# Example App

Check out the [example app](./example) to see remote-modules in action.

# Getting Started

Before you try any of the examples in the README, be sure to:

1. [Install](#installation) remote-modules; and
2. Add `node_modules/.bin` to your PATH (you will need to do this in each terminal window):

  ```bash
  export PATH=$PATH:$PWD/node_modules/.bin
  ```

remote-modules works out of the box with CommonJS or ES6 modules. Let's start with two files:

__remote.js__
```js
export default 'Hello, world!';
```

__client.js__
```js
const Client = require('remote-modules').default;
const client = new Client({ uri: 'http://localhost:3000' });

client.import().then(({ default: hello }) => {
  console.log(hello);
});
```

Open a terminal window and run:
```
> remote-modules start remote.js
```

This does two things:
1. It compiles your modules, using `remote.js` as the entrypoint; and
2. It starts the server that will field requests from `client.js`

If you're curious, you can open `.remote/@default` to see the output (`@default` is the [scope](#scope)).

Now, open another terminal window and run:
```
> node client.js
Hello, world!
```

🎉 You just loaded your first remote module.

# Key Features and Concepts

## Hot Swapping

One of the most powerful features of remote-modules is the ability to hot swap server-side code.

__remote.js__
```js
export default Math.random();
```

__client.js__
```js
const Client = require('remote-modules').default;
const client = new Client({
  ttl: 0,
  uri: 'http://localhost:3000'
});

setInterval(() => {
  client.import().then(({ default: n }) => {
    console.log(`Got a new random number: ${n}`);
  });
}, 100);
```

By default, the client caches modules for 5m before making a request for fresh content. Setting `ttl: 0` forces a new request on each import call.

```
> node client.js
Got a new random number: 0.7270614311072565
Got a new random number: 0.35143236818184165
Got a new random number: 0.3269304992507207
...
```

## Static Evaluation

remote-modules statically evaluates your modules at compile time to eliminate dead code from the output. In many cases you can significantly reduce payload size by telling the compiler how to evaluate certain expressions.

__remote.js__
```js
const Path = require('path-browserify');

function getCwdDirname() {
  return Path.dirname(process.cwd());
}

let cwdDirname;

if (process.browser) {
  cwdDirname = getCwdDirname();
}

if (typeof cwdDirname !== 'undefined') {
  require('querystring-es3');
}

export default cwdDirname;
```

__client.js__
```js
const Client = require('remote-modules').default;
const client = new Client({ uri: 'http://localhost:3000' });

client.import().then(exports => {
  console.log(exports);
});
```

First, start the server by running:
```
> remote-modules start remote.js -d 'process.browser=true'
```

Now, run the client script:
```
> node client.js
{ default: '/path/to/directory/above/cwd' }
```

Note that `path-browserify` and `querystring-es3` are loaded as well. Next, stop the server and restart it with:
```
> remote-modules start remote.js -d 'process.browser=false'
```

And run the client script again:
```
> node client.js
{ default: undefined }
```

This time no dependencies were loaded. Given `process.browser === false`, the compiler had enough information to distill `remote.js` down to:
```js
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
```

## Scope

Scope allows you to create cascading configurations and tailor output for a specific runtime. Until now we've been using the CLI to configure remote-modules, but generally you'll want to use a `.modulerc` file. You can run `remote-modules print-config` to inspect the full config object for each scope.

__.modulerc.js__
```js
module.exports = ({ Scope }) => ({
  entry: 'remote',
  [Scope('browser')]: {
    preset: 'browser'
  },
  [Scope('node')]: {
    preset: 'node'
  }
});
```

__remote.js__
```js
export default `Hello from ${process.browser ? 'browser' : 'node'}!`;
```

__client.js__
```js
const Client = require('remote-modules').default;
const client = new Client({ uri: 'http://localhost:3000' });

client.import(`<@${process.env.SCOPE}>`).then(exports => {
  console.log(exports);
});
```

This time you can start your server without specifying an entrypoint, since we already did so in `.modulerc.js`:
```
> remote-modules start
```

Notice there are now two sets of output - one for `@browser` and another for `@node`. When you run the client this time you'll need to set a `SCOPE` environment variable to specify which scope you want to import:
```
> SCOPE=browser node client.js
{ default: 'Hello from browser!' }

> SCOPE=node node client.js
{ default: 'Hello from node!' }
```

Also notice the `< ... >` in the import request - this is the request format for working with multiple scopes. You can find a more practical use case for namespaces and scopes in the [example app](./example/shell/src/app/router.js#18). The general format of an import request is:
```
[<[namespace/]@scope>][request = entrypoint]
```

## Request Attributes

Request attributes are primarily used to reference static assets. Consider a project with the following structure:

```
project
├─┬ src
│ ├── index.jsx
│ └── styles.css
└─┬ img
  └── image.jpg
```

__src/styles.css__
```css
.image-scoped {
  background-image: url(../img/image.jpg);
}

.image-static {
  background-image: url(<static>../img/image.jpg);
}
```

__src/index.jsx__
```jsx
import React from 'react';

import './styles.css';

export default function MyComponent() {
  return (
    <div>
      <img src={import('<href>../img/image.jpg')} />
      <img src={import('<static>../img/image.jpg')} />
      <div className="image-scoped" />
      <div className="image-static" />
    </div>
  );
}
```

Both the `href` and `static` attributes tell the compiler that these `import(...)` calls should be replaced with URLs. `href` will be transformed to a scoped URL, and `static` will always be transformed to the same URL regardless of scope. Note the `<href>` is implied when referencing assets from stylesheets. The output might look something like:
```js
function MyComponent() {
  return React.createElement("div", null, React.createElement("img", {
    src: "/@scope/_/:./img/image.jpg"
  }), React.createElement("img", {
    src: "/@static/img/image.jpg"
  }), React.createElement("div", {
    className: "image-scoped"
  }), React.createElement("div", {
    className: "image-static"
  }));
}
```

# FAQ

1. Does it work with TypeScript?

    ¯\\\_(ツ)\_/¯

    If it doesn't already, `v1` will.

    In the meantime, assuming you already have [@babel/preset-typescript](https://babeljs.io/docs/en/babel-preset-typescript) setup, you _should_ be able to enable TypeScript support by adding the following to your `.modulerc`:

    ```js
    module.exports = ({ ScriptAdapter }) => ({
      adapters: [{
        test: ({ extension }) => /\.tsx?$/.test(extension),
        adapter: ScriptAdapter
      }],
      babylon: {
        plugins: ['typescript']
      },
      extensions: ['.ts', '.tsx']
    });
    ```
