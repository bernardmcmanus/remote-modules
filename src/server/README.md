# Configuration

The recommended configuration method is a `.modulerc.js` file in your project's root directory.

Property | Type | Default | Description
-------- | ---- | ------- | -----------
root ![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable") | `{string}` | `'.'` | The project root
entry ![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable") | `{string}` | `'.'` | The project entrypoint
output ![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable") | `{string}` | `'.remote'` | The output directory
env ![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable") | `{string}` | See [`env`](#env) | The target build environment
watch ![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable") | `{boolean}` | `false` | Watch source files and rebuild on change
preset ![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable") | `{string}` | See [`preset`](#preset) | Applies a predefined set of options
strict ![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable") | `{boolean}` | `false` | Fail on missing dependency
define ![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable") | `{Object}` | See [`define`](#define) | An object containing expressions to be evaluated by the compiler
provide ![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable") | `{Object}` | `{}` | An object containing variable or import references to be injected by the compiler as needed
extensions ![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable") | `{string[]}` | See [`extensions`](#extensions) | File extensions searched by the resolver
mainFields ![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable") | `{string[]}` | `['module', 'main']` | Package fields searched by the resolver
moduleDirs ![Stable](http://badges.github.io/stability-badges/dist/stable.svg "Stable") | `{string[]}` | `['node_modules']` | Module directories searched by the resolver
middleware ![Experimental](http://badges.github.io/stability-badges/dist/experimental.svg "Experimental") | `{Middleware[]}` | See [`middleware`](#middleware) | An array of objects that can modify resource requests and output
adapters ![Experimental](http://badges.github.io/stability-badges/dist/experimental.svg "Experimental") | `{Object[]}` | See [`adapters`](#adapters) | An array of objects that handle parsing and transforming different file types
optimize ![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable") | `{boolean\|Object}` | See [`optimize`](#optimize) | A boolean or object controlling which optimization transforms are applied during compilation
babel ![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable") | `{Object}` | See [`babel`](#babel) | Options passed to [@babel/core](https://babeljs.io/docs/en/next/babel-core)
babylon ![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable") | `{Object}` | See [`babylon`](#babylon) | Options passed to [@babel/parser](https://babeljs.io/docs/en/next/babel-parser.html)
uglify ![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable") | `{Object\|boolean}` | See [`uglify`](#uglify) | Options passed to [uglify-es](https://github.com/mishoo/UglifyJS2)
server ![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable") | `{Object}` | See [`server`](#server) | Server configuration
sourceMaps ![Unstable](http://badges.github.io/stability-badges/dist/unstable.svg "Unstable") | `{string\|boolean}` | See [`sourceMaps`](#sourceMaps) | Source map configuration
include ![Deprecated](http://badges.github.io/stability-badges/dist/deprecated.svg "Deprecated") | `{string[]}` | `[]` | An array of glob patterns for resources to be included with all import requests
outputTarget ![Deprecated](http://badges.github.io/stability-badges/dist/deprecated.svg "Deprecated") | `{string}` | `'module'` | The module wrapper template
core ![Deprecated](http://badges.github.io/stability-badges/dist/deprecated.svg "Deprecated") | `{Object}` | [browserify/resolve/lib/core.json](https://github.com/browserify/resolve/blob/master/lib/core.json) | An object that defines core modules

### env
```js
process.env.BUILD_ENV || process.env.NODE_ENV || 'development'
```

### preset

- #### browser

  ```js
  {
    mainFields: ['browser'],
    define: {
      'process.browser': true,
      'typeof window': 'object',
      'typeof document': 'object',
      'typeof XMLHttpRequest': 'function'
    },
    provide: {
      global: 'window',
      process: `import process from '${ConfigStore.shims.process}'`,
      Buffer: `import { Buffer } from '${ConfigStore.mocks.buffer}'`
    },
    middleware: [
      // Rewrite requests for node core modules to browser shims
      RewriteMiddleware(
        new RegExp(
          `^(${Object.keys(ConfigStore.shims)
            .map(escapeRegExp)
            .join('|')})$`
        ),
        ctx => ConfigStore.shims[ctx.request]
      )
    ]
  }
  ```

- #### node

  ```js
  {
    define: {
      'process.browser': false,
      'typeof window': 'undefined',
      'typeof document': 'undefined',
      'typeof XMLHttpRequest': 'undefined'
    }
  }
  ```

### define
```js
{
  'process.env.NODE_ENV': define['process.env.BUILD_ENV'] || env,
  'typeof process': 'object'
}
```

### extensions
```js
['.js', '.jsx', '.mjs', '.es', '.es6', '.json']
```

### middleware
```js
[
  // Treat absolute URIs as external resources
  ExternalMiddleware(ctx => isAbsoluteURL(ctx.request)),
  // Treat data URIs as external resources
  ExternalMiddleware(/^data:\w+/i)
]
```

There are two types of middleware: `ContextMiddleware` Runs _before_ the resource is created and is used to modify [`SourceContext`](#sourcecontext). `ResourceMiddleware` Runs _after_ the resource is created and is used to modify [`NormalResource`](#normalresource).

- #### ContextMiddleware

  Generic context middleware. Does nothing on its own, but can be used to perform custom operations on `ctx`.

  ```js
  ContextMiddleware(
    test?: RegExp | (ctx: SourceContext) => boolean,
    apply: (ctx: SourceContext) => void
  )
  ```

- #### ExternalMiddleware `(type: context)`

  Flags a resource request as external. Requests for external resources are left unmodified by the compiler, are not added to the module manifest, and are loaded using [`client.externalRequire`](../client#new-clientoptions--client) when applicable.

  ```js
  ExternalMiddleware(test: RegExp | (ctx: SourceContext) => boolean)
  ```

- #### RewriteMiddleware `(type: context)`

  Rewrites a resource request to the returned value.

  ```js
  RewriteMiddleware(
    test?: RegExp | (ctx: SourceContext) => boolean,
    apply: (ctx: SourceContext) => string
  )
  ```

- #### NullMiddleware `(type: context)`

  Rewrites a resource request to `null`.

  ```js
  NullMiddleware(test: RegExp | (ctx: SourceContext) => boolean)
  ```

- #### ResourceMiddleware

  Generic resource middleware. Does nothing on its own, but can be used to perform custom operations on `resource`.

  ```js
  ResourceMiddleware(
    test?: RegExp | (resource: NormalResource, ctx: SourceContext) => boolean,
    apply: (resource: NormalResource, ctx: SourceContext) => void
  )
  ```

- #### UnionMiddleware `(type: resource)`

  Groups matched resources based on certain criteria (`template`, `resource.async`, `resource.adapter.outputType`) and combines their output based on the values of `minSize` and `maxSize`. Can reduce the total number of HTTP requests per import by combining many small modules into a few larger assets.

  `template` can be used to customize the way resources are grouped. It can contain interpolation placeholders that will be replaced with [resource](#normalresource) properties (i.e. `template: '{packageId}'` would only combine resources with the same packageId).

  `UnionMiddleware` doesn't always play nice with the `watch` option, so it's best not to use them together on resources that will be changing.

  ```js
  UnionMiddleware(options?: {
    minSize?: number = 5e4,
    maxSize?: number = 10e4,
    template?: string,
    test?: (resource: NormalResource, ctx: SourceContext) => boolean
  })
  ```

  __Example__

  ```js
  // Combine all @babel/runtime or core-js modules into a single asset for each package
  UnionMiddleware({
    maxSize: Infinity,
    template: '{packageId}',
    test: ({ packageId }) => packageId === '@babel/runtime' || packageId === 'core-js'
  })

  // Combine all node_modules into assets between 50 kB and 100 kB
  UnionMiddleware({
    test: resource => resource.packageId !== '.'
  })
  ```

### adapters
```js
[
  {
    test: ctx => ctx.extension === '.css',
    adapter: CSSAdapter
  },
  {
    test: ctx => ctx.extension === '.less',
    adapter: LESSAdapter
  },
  {
    test: ctx => ctx.extension === '.sass' || ctx.extension === '.scss',
    adapter: SASSAdapter
  },
  {
    test: ctx => ctx.extension === '.json',
    adapter: JSONAdapter
  },
  {
    test: ctx => defaultExtensions.includes(ctx.extension),
    adapter: ScriptAdapter
  }
]
```

There's not much to say about adapters - the API is going to be overhauled with the next major release, so it's unlikely support for additional file types will be added before then. Customize at your own risk!

If no matching adapter is found, the resource is left unchanged.

### optimize
```js
{
  constantFolding: env === 'production',
  deadCode: true,
  unreferenced: true
}
```

- __constantFolding:__ Applies [babel-plugin-minify-constant-folding](https://github.com/babel/minify/tree/master/packages/babel-plugin-minify-constant-folding)
- __deadCode:__ Applies [babel-plugin-minify-dead-code-elimination](https://github.com/babel/minify/tree/master/packages/babel-plugin-minify-dead-code-elimination)
- __unreferenced:__ Applies [unreferenced identifier transform](./installer/transforms/unreferenced.js)

### babel
```js
{
  envName: process.env.BABEL_ENV || env
}
```
Accepts any options supported by [@babel/core](https://babeljs.io/docs/en/next/babel-core#options)

### babylon
```js
{
  sourceType: 'module',
  plugins: [
    'asyncGenerators',
    'classProperties',
    'dynamicImport',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'jsx',
    'objectRestSpread'
  ]
}
```

Accepts any options supported by [@babel/parser](https://babeljs.io/docs/en/next/babel-parser.html#options)

### uglify
```js
{
  compress: {
    // https://github.com/mishoo/UglifyJS2/issues/2874
    inline: false
  },
  output: {
    comments: false
  }
}
```

Accepts any options supported by [uglify-es](https://github.com/mishoo/UglifyJS2/tree/harmony#minify-options-structure)

### server
```js
{
  port: 3000,
  uri: 'http://localhost:3000',
  publicPath: Url.parse(server.uri).pathname,
  redirects: env === 'development'
}
```
- __port:__ The server's internal port
- __uri:__ The full, public server uri, i.e. `https://mydomain.io/modules/foo`
- __redirects:__ Enables canonical URL redirects, i.e. `/@default => /@default/_/index.js`

### sourceMaps
```js
env === 'production' ? true : 'inline'
```
- __inline:__ Generate and append base64-encoded source maps
- __hidden:__ Generate external source maps but don't append the URLs
- __true:__ Generate external source maps and append the URLs
- __false:__ Don't generate source maps

<sup>__NOTE:__ `sourceMaps` cannot be combined with [`UnionMiddleware`](#unionmiddleware-type-resource). See [#26](https://github.com/bernardmcmanus/remote-modules/issues/26).</sup>

# SourceContext

```js
SourceContext {
  async: boolean,
  error: Error | null,
  extension: string | null,
  force?: string,
  moduleId: string,
  origin: string,
  packageId: string | null,
  pid: number,
  request: string,
  resolved: string | null,
  slug: string | null,
  url: string,
  isExternal: () => boolean,
  isNull: () => boolean
}
```

# NormalResource

```js
NormalResource {
  async: boolean,
  error: Error | null,
  moduleId: string,
  origin: string,
  packageId: string | null,
  pid: number,
  slug: string | null,
  url: string,
  isExternal: () => boolean,
  isNull: () => boolean
}
```

# Server

## new Server([options]) ⇒ `Server`

Param | Type | Description
----- | ---- | -----------
[options] | `{Object}` | Any options listed in the [Configuration](#configuration) section

## server.install([force]) ⇒ `Promise<NormalResource>`

Param | Type | Default | Description
----- | ---- | ------- | -----------
[force] | `{boolean}` | false | Force a fresh install

## server.listen([port]) ⇒ `Promise<void>`

Param | Type | Default | Description
----- | ---- | ------- | -----------
[port] | `{number}` | `server.port` | The server port

## server.close() ⇒ `Promise<void>`
