/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "warn",
      comment:
        "This dependency is part of a circular relationship. You might want to revise " +
        "your solution (i.e. use dependency inversion, make sure the modules have a single responsibility) ",
      from: {},
      to: {
        circular: true,
      },
    },

    {
      name: "no-orphans",
      comment:
        "This is an orphan module - it's likely not used (anymore?). Either use it or " +
        "remove it. If it's logical this module is an orphan (i.e. it's a config file), " +
        "add an exception for it in your dependency-cruiser configuration. By default " +
        "this rule does not scrutinize dot-files (e.g. .eslintrc.js), TypeScript declaration " +
        "files (.d.ts), tsconfig.json and some of the babel and webpack configs.",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$", // dot files
          "\\.d\\.ts$", // TypeScript declaration files
          "(^|/)tsconfig\\.json$", // TypeScript config
          "(^|/)(babel|webpack)\\.config\\.(js|cjs|mjs|ts|json)$", // other configs
        ],
      },
      to: {},
    },

    {
      name: "no-deprecated-core",
      comment:
        "A module depends on a node core module that has been deprecated. Find an alternative - these are " +
        "bound to exist - node doesn't deprecate lightly.",
      severity: "warn",
      from: {},
      to: {
        dependencyTypes: ["core"],
        path: [
          "^(v8/tools/codemap)$",
          "^(v8/tools/consarray)$",
          "^(v8/tools/csvparser)$",
          "^(v8/tools/logreader)$",
          "^(v8/tools/profile_view)$",
          "^(v8/tools/profile)$",
          "^(v8/tools/SourceMap)$",
          "^(v8/tools/splaytree)$",
          "^(v8/tools/tickprocessor-driver)$",
          "^(v8/tools/tickprocessor)$",
          "^(node-inspect/lib/_inspect)$",
          "^(node-inspect/lib/internal/inspect_client)$",
          "^(node-inspect/lib/internal/inspect_repl)$",
          "^(async_hooks)$",
          "^(punycode)$",
          "^(domain)$",
          "^(constants)$",
          "^(sys)$",
          "^(_linklist)$",
          "^(_stream_wrap)$",
        ],
      },
    },

    {
      name: "not-to-deprecated",
      comment:
        "This module uses a (version of an) npm module that has been deprecated. Either upgrade to a later " +
        "version of that module, or find an alternative. Deprecated modules are a security risk.",
      severity: "warn",
      from: {},
      to: {
        dependencyTypes: ["deprecated"],
      },
    },

    {
      name: "no-non-package-json",
      severity: "error",
      comment:
        "This module depends on an npm package that isn't in the 'dependencies' section of your package.json. " +
        "That's problematic as the package either (1) won't be available on live (2 - worse) will be " +
        "available on live with an non-guaranteed version. Fix it by adding the package to the dependencies " +
        "in your package.json.",
      from: {},
      to: {
        dependencyTypes: ["npm-no-pkg", "npm-unknown"],
      },
    },

    {
      name: "not-to-unresolvable",
      comment:
        "This module depends on a module that cannot be found ('resolved to disk'). If it's an npm " +
        "module: add it to your package.json. In all other cases you likely already know what to do.",
      severity: "error",
      from: {},
      to: {
        couldNotResolve: true,
      },
    },

    {
      name: "no-duplicate-dep-types",
      comment:
        "Likely this module depends on an external ('npm') package that occurs more than once " +
        "in your package.json i.e. bot as a devDependencies and in dependencies. This will cause " +
        "maintenance problems later on.",
      severity: "warn",
      from: {},
      to: {
        moreThanOneDependencyType: true,
        // as it's pretty common to have a type import be a type only import
        // _and_ (e.g.) a devDependency - don't consider type-only dependency
        // types for this rule
        dependencyTypesNot: ["type-only"],
      },
    },

    /* rules you might want to tweak for your specific situation: */
    {
      name: "not-to-test",
      comment:
        "This module depends on code within a folder that should only contain tests. As tests don't " +
        "implement functionality this is odd. Either you're writing a test outside the test folder " +
        "or there's something in the test folder that isn't a test.",
      severity: "error",
      from: { pathNot: "/__tests__/" },
      to: { path: "/__tests__/" },
    },

    // "Swimlane 0" - lib/
    {
      name: "illegal-import-from-libs",
      comment:
        "All modules in lib/ must have no other dependencies. They aren't Liveblocks-specific. They could, theoretically, be NPM packages of their own.",
      severity: "error",
      from: { path: "^src/lib/" },
      to: { pathNot: "^src/(lib)/" },
    },

    // "Swimlane 1" - protocol/
    {
      name: "illegal-import-from-protocol",
      comment:
        "All modules in protocol/ must have no other dependencies apart from lib/.",
      severity: "error",
      from: { path: "^src/protocol/" },
      to: { pathNot: "^src/(protocol|lib)/" },
    },

    // "Swimlane 2" - types/
    {
      name: "illegal-import-from-types",
      comment:
        "All modules in types/ must have no other dependencies apart from protocol/ or lib/.",
      severity: "error",
      from: { path: "^src/types/" },
      to: { pathNot: "^src/(types|protocol|lib)/" },
    },

    // "Swimlane 3" - refs/
    {
      name: "illegal-import-from-refs",
      comment:
        "All modules in refs/ must have no other dependencies apart from types/, protocol/ or lib/.",
      severity: "error",
      from: { path: "^src/refs/" },
      to: { pathNot: "^src/(refs|types|protocol|lib)/" },
    },

    // "Swimlane 4" - crdts/
    {
      name: "illegal-import-from-crdts",
      comment:
        "All modules in crdts/ must have no other dependencies apart from refs/, types/, protocol/ or lib/.",
      severity: "error",
      from: { path: "^src/crdts/" },
      to: { pathNot: "^src/(crdts|refs|types|protocol|lib)/" },
    },
  ],

  options: {
    /* conditions specifying which files not to follow further when encountered:
       - path: a regular expression to match
       - dependencyTypes: see https://github.com/sverweij/dependency-cruiser/blob/master/doc/rules-reference.md#dependencytypes-and-dependencytypesnot
       for a complete list
    */
    doNotFollow: {
      path: "node_modules",
    },

    /* conditions specifying which dependencies to exclude
       - path: a regular expression to match
       - dynamic: a boolean indicating whether to ignore dynamic (true) or static (false) dependencies.
          leave out if you want to exclude neither (recommended!)
    */
    // exclude : {
    //   path: '',
    //   dynamic: true
    // },

    /* pattern specifying which files to include (regular expression)
       dependency-cruiser will skip everything not matching this pattern
    */
    // includeOnly : '',

    /* dependency-cruiser will include modules matching against the focus
       regular expression in its output, as well as their neighbours (direct
       dependencies and dependents)
    */
    // focus : '',

    /* list of module systems to cruise */
    // moduleSystems: ['amd', 'cjs', 'es6', 'tsd'],

    /* prefix for links in html and svg output (e.g. 'https://github.com/you/yourrepo/blob/develop/'
       to open it on your online repo or `vscode://file/${process.cwd()}/` to 
       open it in visual studio code),
     */
    // prefix: '',

    /* false (the default): ignore dependencies that only exist before typescript-to-javascript compilation
       true: also detect dependencies that only exist before typescript-to-javascript compilation
       "specify": for each dependency identify whether it only exists before compilation or also after
     */
    tsPreCompilationDeps: true,

    /* list of extensions (typically non-parseable) to scan. Empty by default. */
    // extraExtensionsToScan: [".json", ".jpg", ".png", ".svg", ".webp"],

    /* if true combines the package.jsons found from the module up to the base
       folder the cruise is initiated from. Useful for how (some) mono-repos
       manage dependencies & dependency definitions.
     */
    // combinedDependencies: false,

    /* if true leave symlinks untouched, otherwise use the realpath */
    // preserveSymlinks: false,

    /* TypeScript project file ('tsconfig.json') to use for
       (1) compilation and
       (2) resolution (e.g. with the paths property)

       The (optional) fileName attribute specifies which file to take (relative to
       dependency-cruiser's current working directory). When not provided
       defaults to './tsconfig.json'.
     */
    tsConfig: {
      fileName: "tsconfig.json",
    },

    /* Webpack configuration to use to get resolve options from.

       The (optional) fileName attribute specifies which file to take (relative
       to dependency-cruiser's current working directory. When not provided defaults
       to './webpack.conf.js'.

       The (optional) `env` and `args` attributes contain the parameters to be passed if
       your webpack config is a function and takes them (see webpack documentation
       for details)
     */
    // webpackConfig: {
    //  fileName: './webpack.config.js',
    //  env: {},
    //  args: {},
    // },

    /* Babel config ('.babelrc', '.babelrc.json', '.babelrc.json5', ...) to use
      for compilation (and whatever other naughty things babel plugins do to
      source code). This feature is well tested and usable, but might change
      behavior a bit over time (e.g. more precise results for used module 
      systems) without dependency-cruiser getting a major version bump.
     */
    // babelConfig: {
    //   fileName: './.babelrc'
    // },

    /* List of strings you have in use in addition to cjs/ es6 requires
       & imports to declare module dependencies. Use this e.g. if you've
       re-declared require, use a require-wrapper or use window.require as
       a hack.
    */
    // exoticRequireStrings: [],
    /* options to pass on to enhanced-resolve, the package dependency-cruiser
       uses to resolve module references to disk. You can set most of these
       options in a webpack.conf.js - this section is here for those
       projects that don't have a separate webpack config file.

       Note: settings in webpack.conf.js override the ones specified here.
     */
    enhancedResolveOptions: {
      /* List of strings to consider as 'exports' fields in package.json. Use
         ['exports'] when you use packages that use such a field and your environment
         supports it (e.g. node ^12.19 || >=14.7 or recent versions of webpack).

        If you have an `exportsFields` attribute in your webpack config, that one
         will have precedence over the one specified here.
      */
      exportsFields: ["exports"],
      /* List of conditions to check for in the exports field. e.g. use ['imports']
         if you're only interested in exposed es6 modules, ['require'] for commonjs,
         or all conditions at once `(['import', 'require', 'node', 'default']`)
         if anything goes for you. Only works when the 'exportsFields' array is
         non-empty.

        If you have a 'conditionNames' attribute in your webpack config, that one will
        have precedence over the one specified here.
      */
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      dot: {
        /* pattern of modules that can be consolidated in the detailed
           graphical dependency graph. The default pattern in this configuration
           collapses everything in node_modules to one folder deep so you see
           the external modules, but not the innards your app depends upon.
         */
        collapsePattern: "node_modules/[^/]+",

        /* Options to tweak the appearance of your graph.See
           https://github.com/sverweij/dependency-cruiser/blob/master/doc/options-reference.md#reporteroptions
           for details and some examples. If you don't specify a theme
           don't worry - dependency-cruiser will fall back to the default one.
        */
        theme: {
          graph: {
            // rankdir: "TD", // Vertical
            /* use splines: "ortho" for straight lines. Be aware though
               graphviz might take a long time calculating ortho(gonal)
               routings.
            */
            splines: "true",
          },
          //   modules: [
          //     {
          //       criteria: { matchesFocus: true },
          //       attributes: {
          //         fillcolor: "lime",
          //         penwidth: 2,
          //       },
          //     },
          //     {
          //       criteria: { matchesFocus: false },
          //       attributes: {
          //         fillcolor: "lightgrey",
          //       },
          //     },
          //     {
          //       criteria: { matchesReaches: true },
          //       attributes: {
          //         fillcolor: "lime",
          //         penwidth: 2,
          //       },
          //     },
          //     {
          //       criteria: { matchesReaches: false },
          //       attributes: {
          //         fillcolor: "lightgrey",
          //       },
          //     },
          //     {
          //       criteria: { source: "^src/model" },
          //       attributes: { fillcolor: "#ccccff" }
          //     },
          //     {
          //       criteria: { source: "^src/view" },
          //       attributes: { fillcolor: "#ccffcc" }
          //     },
          //   ],
          //   dependencies: [
          //     {
          //       criteria: { "rules[0].severity": "error" },
          //       attributes: { fontcolor: "red", color: "red" }
          //     },
          //     {
          //       criteria: { "rules[0].severity": "warn" },
          //       attributes: { fontcolor: "orange", color: "orange" }
          //     },
          //     {
          //       criteria: { "rules[0].severity": "info" },
          //       attributes: { fontcolor: "blue", color: "blue" }
          //     },
          //     {
          //       criteria: { resolved: "^src/model" },
          //       attributes: { color: "#0000ff77" }
          //     },
          //     {
          //       criteria: { resolved: "^src/view" },
          //       attributes: { color: "#00770077" }
          //     }
          //   ]
        },
      },
      archi: {
        /* pattern of modules that can be consolidated in the high level
          graphical dependency graph. If you use the high level graphical
          dependency graph reporter (`archi`) you probably want to tweak
          this collapsePattern to your situation.
        */
        collapsePattern:
          "^(packages|src|lib|app|bin|test(s?)|spec(s?))/[^/]+|node_modules/[^/]+",

        /* Options to tweak the appearance of your graph.See
           https://github.com/sverweij/dependency-cruiser/blob/master/doc/options-reference.md#reporteroptions
           for details and some examples. If you don't specify a theme
           for 'archi' dependency-cruiser will use the one specified in the
           dot section (see above), if any, and otherwise use the default one.
         */
        // theme: {
        // },
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
