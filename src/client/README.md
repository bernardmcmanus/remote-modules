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
[options.ttl] | `{number}` | browser: `Infinity`</br>node: `forceLoad ? 0 : 3e5 (node)` | TTL (in ms) for cached modules
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
<script src="/@default/_/fbjs/lib/emptyFunction.js"></script>
<script src="/@default/_/fbjs/lib/warning.js"></script>
<script src="/@default/_/fbjs/lib/emptyObject.js"></script>
<script src="/@default/_/fbjs/lib/invariant.js"></script>
<script src="/@default/_/object-assign/index.js"></script>
<script src="/@default/_/react/cjs/react.production.min.js"></script>
<script src="/@default/_/react/index.js" data-module-id="react/index.js" data-pid="682820962" data-main></script>
<script data-module-id="react/index.js" type="application/json">{...}</script>
```

## client.reset([action]) ⇒ `Promise<any>`

Used in browser to remove tags added by the previous `import` call. This is handled internally between imports, so you only need to call `reset` when you want to remove existing tags without replacing them. In node `reset` is a noop, but it will always return the result of `action`. See the example app [router](../../example/shell/src/app/router.js).

Param | Type | Description
----- | ---- | -----------
[action] | `{function}` | The action to be performed prior to removing existing tags
