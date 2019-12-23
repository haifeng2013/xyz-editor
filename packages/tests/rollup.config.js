const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const postcss = require('rollup-plugin-postcss');
const typescript = require('rollup-plugin-typescript');
const virtual = require('@rollup/plugin-virtual');
const globImport = require('rollup-plugin-glob-import');
const copy = require('rollup-plugin-copy');
const del = require('rollup-plugin-delete');
const json = require('@rollup/plugin-json');


module.exports = function(config) {
    // env.slow
    // env.grep
    // env.fgrep
    // env.invert

    const environments = config.environments;

    const credentials = config.credentials;

    const sourceFiles = config.sourceFiles;

    const compsToRun = config.compsToRun;

    const testFilter = config.testFilter;

    const httpServer = config.httpServer;

    const specsFileName = 'specs.js';

    let bundles = [];

    if (compsToRun.indexOf('common') > -1 ) {
        let mochaSettings = {};

        if (testFilter['common']) {
            mochaSettings = {grep: testFilter['common']};
        }

        Object.assign(mochaSettings, config.mochaSettings);

        bundles.push({
            input: {
                input: './src/main-common.ts',
                external: ['@here/xyz-maps-core', '@here/xyz-maps-common'],
                plugins: [
                    virtual({
                        'settings': 'export default' + JSON.stringify(mochaSettings),
                        'environments': 'export default' + JSON.stringify(environments),
                        'credentials': 'export default' + JSON.stringify(credentials),
                        'httpServer': 'export default' + JSON.stringify(httpServer)
                    }),
                    typescript({
                        typescript: require('typescript'),
                        // only compileroptions are read from tsconfig.json
                        include: ['src/**/*'],
                        exclude: ['node_modules', 'dist']
                    }),
                    json(),
                    del({targets: 'dist/common'}),
                    resolve(),
                    commonjs(),
                    postcss({
                        plugins: []
                    })
                ]
            },
            output: {
                file: 'dist/common/commonTests.js',
                format: 'umd',
                name: 'here.test',
                sourcemap: true,
                globals: {
                    '@here/xyz-maps-core': 'here.xyz.maps',
                    '@here/xyz-maps-common': 'here.xyz.maps.common'
                }
            }
        }, {
            input: {
                input: 'specs/common/main.js',
                external: ['hereTest', '@here/xyz-maps-common'],
                plugins: [
                    typescript({
                        typescript: require('typescript'),
                        // only compileroptions are read from tsconfig.json
                        include: ['specs/common/**/*']
                    }),
                    json(),
                    del({targets: 'dist/common/specs*.js'}),
                    virtual({
                        'sourceFiles': 'export default' + JSON.stringify(sourceFiles)
                    }),
                    globImport({
                        format: 'import'
                    }),
                    resolve(),
                    commonjs(),
                    copy({
                        targets: [{src: 'templates/runnercommon.html', dest: 'dist/common'}]
                    })
                ]
            },
            output: {
                file: 'dist/common/'+specsFileName,
                format: 'umd',
                name: 'commonTests',
                sourcemap: true,
                globals: {
                    'hereTest': 'here.test',
                    '@here/xyz-maps-common': 'here.xyz.maps.common'
                }
            }
        });
    }

    if (compsToRun.indexOf('core') > -1 ) {
        let mochaSettings = {};

        if (testFilter['core']) {
            mochaSettings = {grep: testFilter['core']};
        }

        Object.assign(mochaSettings, config.mochaSettings);

        bundles.push({
            input: {
                input: './src/main-core.ts',
                external: ['@here/xyz-maps-core', '@here/xyz-maps-common'],
                plugins: [
                    typescript({
                        typescript: require('typescript'),
                        // only compileroptions are read from tsconfig.json
                        include: ['src/**/*'],
                        exclude: ['node_modules', 'dist']
                    }),
                    json(),
                    del({targets: 'dist/core'}),
                    virtual({
                        'settings': 'export default' + JSON.stringify(mochaSettings),
                        'environments': 'export default' + JSON.stringify(environments),
                        'credentials': 'export default' + JSON.stringify(credentials),
                        'httpServer': 'export default' + JSON.stringify(httpServer)
                    }),
                    resolve(),
                    commonjs(),
                    postcss({
                        plugins: []
                    })
                ]
            },
            output: {
                file: 'dist/core/coreTests.js',
                format: 'umd',
                name: 'here.test',
                sourcemap: true,
                globals: {
                    '@here/xyz-maps-core': 'here.xyz.maps',
                    '@here/xyz-maps-common': 'here.xyz.maps.common'
                }
            }
        }, {
            input: {
                input: 'specs/core/main.js',
                external: ['hereTest', '@here/xyz-maps-common', '@here/xyz-maps-core', '@here/xyz-maps-editor'],

                plugins: [
                    typescript({
                        typescript: require('typescript'),
                        // only compileroptions are read from tsconfig.json
                        include: ['specs/core/**/*']
                    }),
                    json(),
                    del({targets: 'dist/core/specs*.js'}),
                    virtual({
                        'sourceFiles': 'export default' + JSON.stringify(sourceFiles)
                    }),
                    globImport({
                        format: 'import'
                    }),
                    resolve(),
                    commonjs(),
                    copy({
                        targets: [{src: 'templates/runnercore.html', dest: 'dist/core'}]
                    })
                ]
            },
            output: {
                file: 'dist/core/'+specsFileName,
                format: 'umd',
                name: 'coreTests',
                sourcemap: true,
                globals: {
                    'hereTest': 'here.test'
                }
            }
        });
    }

    if (compsToRun.indexOf('display') > -1 ) {
        let mochaSettings = {};

        if (testFilter['display']) {
            mochaSettings = {grep: testFilter['display']};
        }

        Object.assign(mochaSettings, config.mochaSettings);

        bundles.push({
            input: {
                input: './src/main-display.ts',
                external: ['@here/xyz-maps-core', '@here/xyz-maps-common', '@here/xyz-maps-display'],
                plugins: [
                    typescript({
                        typescript: require('typescript'),
                        // only compileroptions are read from tsconfig.json
                        include: ['src/**/*'],
                        exclude: ['node_modules', 'dist']
                    }),
                    json(),
                    del({targets: 'dist/display'}),
                    virtual({
                        'settings': 'export default' + JSON.stringify(mochaSettings),
                        'environments': 'export default' + JSON.stringify(environments),
                        'credentials': 'export default' + JSON.stringify(credentials),
                        'httpServer': 'export default' + JSON.stringify(httpServer)
                    }),
                    resolve(),
                    commonjs(),
                    postcss({
                        plugins: []
                    })
                ]
            },
            output: {
                file: 'dist/display/displayTests.js',
                format: 'umd',
                name: 'here.test',
                sourcemap: true,
                globals: {
                    '@here/xyz-maps-core': 'here.xyz.maps',
                    '@here/xyz-maps-common': 'here.xyz.maps.common',
                    '@here/xyz-maps-display': 'here.xyz.maps.Map'
                }
            }
        }, {
            input: {
                input: 'specs/display/main.js',
                external: ['hereTest', '@here/xyz-maps-core', '@here/xyz-maps-display', '@here/xyz-maps-editor'],

                plugins: [
                    typescript({
                        typescript: require('typescript'),
                        // only compileroptions are read from tsconfig.json
                        include: ['specs/display/**/*']
                    }),
                    json(),
                    del({targets: 'dist/display/specs*.js'}),
                    virtual({
                        'sourceFiles': 'export default' + JSON.stringify(sourceFiles)
                    }),
                    globImport({
                        format: 'import'
                    }),
                    resolve(),
                    commonjs(),
                    copy({
                        targets: [{src: 'templates/runnerdisplay.html', dest: 'dist/display'}]
                    })
                ]
            },
            output: {
                file: 'dist/display/'+specsFileName,
                format: 'umd',
                name: 'displayTests',
                sourcemap: true,
                globals: {
                    'hereTest': 'here.test',
                    '@here/xyz-maps-core': 'here.xyz.maps'
                }
            }
        });
    }

    if (compsToRun.indexOf('editor') > -1 ) {
        let mochaSettings = {};

        if (testFilter['editor']) {
            mochaSettings = {grep: testFilter['editor']};
        }

        Object.assign(mochaSettings, config.mochaSettings);

        bundles.push({
            input: {
                input: './src/main-editor.ts',
                external: ['@here/xyz-maps-core', '@here/xyz-maps-editor'],
                plugins: [
                    typescript({
                        typescript: require('typescript'),
                        // only compileroptions are read from tsconfig.json
                        include: ['src/**/*'],
                        exclude: ['node_modules', 'dist']
                    }),
                    json(),
                    del({targets: 'dist/editor'}),
                    virtual({
                        'settings': 'export default' + JSON.stringify(mochaSettings),
                        'environments': 'export default' + JSON.stringify(environments),
                        'credentials': 'export default' + JSON.stringify(credentials),
                        'httpServer': 'export default' + JSON.stringify(httpServer)
                    }),
                    resolve(),
                    commonjs(),
                    postcss({
                        plugins: []
                    })
                ]
            },
            output: {
                file: 'dist/editor/editorTests.js',
                format: 'umd',
                name: 'here.test',
                sourcemap: true,
                globals: {
                    '@here/xyz-maps-core': 'here.xyz.maps',
                    '@here/xyz-maps-editor': 'here.xyz.maps.editor'
                }
            }
        }, {
            input: {
                input: 'specs/editor/main.js',
                external: ['hereTest', '@here/xyz-maps-core', '@here/xyz-maps-display', '@here/xyz-maps-editor'],
                plugins: [
                    typescript({
                        typescript: require('typescript'),
                        // only compileroptions are read from tsconfig.json
                        include: ['specs/editor/**/*']
                    }),
                    json(),
                    del({targets: 'dist/editor/specs*.js'}),
                    virtual({
                        'sourceFiles': 'export default' + JSON.stringify(sourceFiles)
                    }),
                    globImport({
                        format: 'import'
                    }),
                    resolve(),
                    commonjs(),
                    copy({
                        targets: [{src: 'templates/runnereditor.html', dest: 'dist/editor'}]
                    })
                ]
            },
            output: {
                file: 'dist/editor/'+specsFileName,
                format: 'umd',
                name: 'editorTests',
                sourcemap: true,
                globals: {
                    'hereTest': 'here.test',
                    '@here/xyz-maps-core': 'here.xyz.maps',
                    '@here/xyz-maps-editor': 'here.xyz.maps.editor'
                }
            }
        });
    }

    return bundles;
};
