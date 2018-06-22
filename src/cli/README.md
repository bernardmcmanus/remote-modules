# CLI
```
Usage: remote-modules <command> [options]

Commands:
  remote-modules print-config [options]     Display the assembled config object(s)
  remote-modules install [entry] [options]  Prep the code you want to serve remotely
  remote-modules start [entry] [options]    Start the server

Options:
  --version     Show version number                                                        [boolean]
  --help        Show help                                                                  [boolean]
  --scope, -s   Config scope                                                                [string]
  --config, -c  Path to a .modulerc file                               [string] [default: .modulerc]
  --preset, -p  Load target presets                                                         [string]
```

## print-config
```
remote-modules print-config [options]

Display the assembled config object(s)

Options:
  --version     Show version number                                                        [boolean]
  --help        Show help                                                                  [boolean]
  --scope, -s   Config scope                                                                [string]
  --config, -c  Path to a .modulerc file                               [string] [default: .modulerc]
  --preset, -p  Load target presets                                                         [string]
```

## install
```
remote-modules install [entry] [options]

Prep the code you want to serve remotely

Positionals:
  entry  Install entrypoint                                                                 [string]

Options:
  --version      Show version number                                                       [boolean]
  --help         Show help                                                                 [boolean]
  --scope, -s    Config scope                                                               [string]
  --config, -c   Path to a .modulerc file                              [string] [default: .modulerc]
  --preset, -p   Load target presets                                                        [string]
  --define, -d   Variable definitions to be evaluated at install               [array] [default: []]
  --ext, -e      Extensions to resolve               [array] [default: .js,.jsx,.mjs,.es,.es6,.json]
  --force, -f    Skip cache and install directly from source              [boolean] [default: false]
  --include, -i  Include pattern                                                 [array] [default: ]
  --mainfields   Package entrypoints                                         [array] [default: main]
  --moduledirs   Module directories                                  [array] [default: node_modules]
  --output, -o   Output directory                                        [string] [default: .remote]
  --root, -r     Project root                                                  [string] [default: .]
  --strict       Fail on missing dependency                                                [boolean]
  --target       Output target                                            [string] [default: module]
  --uglify       Uglify output                                                             [boolean]
  --verbose, -v  Verbose logging                                           [boolean] [default: true]
  --workers      Run multi-scope installs on worker processes              [boolean] [default: true]
```

## start
```
remote-modules start [entry] [options]

Start the server

Positionals:
  entry  Install entrypoint                                                                 [string]

Options:
  --version      Show version number                                                       [boolean]
  --help         Show help                                                                 [boolean]
  --scope, -s    Config scope                                                               [string]
  --config, -c   Path to a .modulerc file                              [string] [default: .modulerc]
  --preset, -p   Load target presets                                                        [string]
  --define, -d   Variable definitions to be evaluated at install               [array] [default: []]
  --ext, -e      Extensions to resolve               [array] [default: .js,.jsx,.mjs,.es,.es6,.json]
  --force, -f    Skip cache and install directly from source              [boolean] [default: false]
  --include, -i  Include pattern                                                 [array] [default: ]
  --mainfields   Package entrypoints                                         [array] [default: main]
  --moduledirs   Module directories                                  [array] [default: node_modules]
  --output, -o   Output directory                                        [string] [default: .remote]
  --root, -r     Project root                                                  [string] [default: .]
  --strict       Fail on missing dependency                                                [boolean]
  --target       Output target                                            [string] [default: module]
  --uglify       Uglify output                                                             [boolean]
  --verbose, -v  Verbose logging                                           [boolean] [default: true]
  --production   Start in production mode                                                  [boolean]
  --watch        Watch for changes                                                         [boolean]
```
