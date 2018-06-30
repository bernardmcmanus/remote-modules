# Client

__IMPORTANT:__ Be sure to load the prebuilt bundle when using `Client` in browser. See the example app [webpack config](../../example/shell/webpack/config.shell.js).

## new Client(options) ⇒ `Client`

Param | Type | Default | Description
----- | ---- | ------- | -----------
options | `{Object}` | |
options.uri | `{string}` | | The URI for the remote-modules server
[options.context] | `{Object}` | `global` | The context in which modules will be executed
[options.externalRequire] | `{Function}` | [`getDefaultExternalRequire()`](./loader.js) | The function used to require external modules
[options.forceLoad] | `{boolean}` | `NODE_ENV === 'development'` | Request fresh content on every import call
[options.ttl] | `{number}` | `forceLoad ? 0 : 3e5` | TTL (in ms) for cached modules
[options.registry] | `{Registry}` | `new Registry(ttl)` | The module registry

## client.import([request]) ⇒ `Promise<AsyncModule.exports>`

Imports a remote module

Param | Type | Description
----- | ---- | -----------
[request] | `{string}` | A string of the form: `[<[namespace/]@scope>][request]`

__Example__

```js
await client.import(); // implies '<@default>{entry}'
await client.import('./lib/helpers'); // implies '<@default>./lib/helpers'
await client.import('react'); // implies '<@default>react'
await client.import('<@browser>react');
await client.import('<@node>react');
await client.import('<namespace/@scope>react');
```

## client.renderStatic([request], [type]) ⇒ `Promise<string>`

Renders static markup given an import request. Optionally render tags for only a specific resource type.

Param | Type | Description
----- | ---- | -----------
[request] | `{string}` | A string of the form: `[<[namespace/]@scope>][request]`
[type] | `{string}` | The resource type - either `js` or `css`

__Example__

```js
await client.import('react');
```

would return the following string:

```html
<script src="/@default/_/prop-types/lib/ReactPropTypesSecret.js"></script>
<script src="/@default/_/prop-types/checkPropTypes.js"></script>
<script src="/@default/_/react/node_modules/fbjs/lib/emptyFunction.js"></script>
<script src="/@default/_/react/node_modules/fbjs/lib/warning.js"></script>
<script src="/@default/_/react/node_modules/fbjs/lib/emptyObject.js"></script>
<script src="/@default/_/react/node_modules/fbjs/lib/invariant.js"></script>
<script src="/@default/_/object-assign/index.js"></script>
<script src="/@default/_/react/cjs/react.development.js"></script>
<script src="/@default/_/react/index.js" data-module-id="react/index.js" data-pid="682820962" data-main></script>
<script data-module-id="react/index.js" type="application/json">{...}</script>
```
