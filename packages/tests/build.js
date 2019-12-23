const fs = require('fs');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const argv = require('yargs').argv;
const path = require('path');
const rollup = require('rollup');
const KarmaServer = require('karma').Server;
const cfg = require('karma').config;
const http = require('http');
const request = require('request');

var testReport = {};

var settings = {
    browser: false,
    singlerun: true // run tests and then exit with an exit code of 0 or 1 depending on whether all tests passed or any tests failed.
};

var mochaSettings = {
    ui: 'bdd',
    reporter: 'html',
    timeout: 20000,
    bail: false
};
var mochaConfigs = ['bail', 'timeout', 'slow', 'grep', 'fgrep', 'invert'];

var environments = {};
var credentials = {};
var environmentsPath = './environments.json';
var credentialsPath = './credentials.json';

var parallelTest = true;

var httpServer = {port: 8090};

var sourceFiles = {
    'editor-src': '../editor/dist/xyz-maps-editor.js',
    'display-src': '../display/dist/xyz-maps-display.js',
    'core-src': '../core/dist/xyz-maps-core.js',
    'common-src': '../common/dist/xyz-maps-common.js'
};

let browsers = ['ChromeHeadlessV'];
let apiComponents = ['editor', 'display', 'core', 'common'];
let testFilter = {};
let compsToRun = [];

let karmaBasePath = '../';

// parameters are: 'editor-src', 'display-src', 'core-src', 'common-src'
function validateFiles() {
    getArguments();

    var sources = [];
    var sourceMap = {};
    var src;

    for (var s in sourceFiles) {
        sourceFiles[s] = src = path.relative(karmaBasePath, argv[s] || path.join(__dirname, sourceFiles[s]));
        sourceMap[s] = src;
        sources.push(src);

        if (!fs.existsSync(karmaBasePath + src)) {
            throw Error('File not found for "' + s + '": ' + karmaBasePath + src);
            return;
        }
    }
};

function getArguments() {
    // pass credential in argument
    try {
        // credentialsPath = argv.credentials || credentialsPath;
        credentialsPath = argv.credentials || path.join(__dirname, credentialsPath);
        credentials = require(credentialsPath);
        // credentials = JSON.parse(fs.readFileSync(redentialsPath));
    } catch (e) {
        throw e;
        // throw Error(credentialsPath + ' not found! Please refer to README.md for details');
    }

    // pass environment in argument
    try {
        // environmentsPath = argv.environments || environmentsPath;
        environmentsPath = argv.environments || path.join(__dirname, environmentsPath);
        environments = require(environmentsPath);
    } catch (e) {
        throw e;
        // throw Error(environmentsPath + ' not found! Please refer to README.md for details');
    }

    parallelTest = argv.parallel ? (argv.parallel === 'true' || argv.parallel === true) : parallelTest;

    // Get CLI parameters
    for (let s in argv) {
        let ls = s.toLowerCase();

        if (settings.hasOwnProperty(ls)) {
            // browser, singleRun are set here
            settings[ls] = argv[s];
        } else if (apiComponents.indexOf(ls) > -1) {
            if (argv[s] == 'true' || argv[s] == true) {
                compsToRun.push(ls);
            } else if (typeof argv[s] == 'string' && argv[s] != 'false') {
                compsToRun.push(ls);
                testFilter[ls] = decodeURI(argv[s]);
            } else if (argv[s] == 'false') {
                apiComponents.splice(apiComponents.indexOf(ls), 1);
            }
        } else if (mochaConfigs.indexOf(ls) > -1) {
            mochaSettings[ls] = argv[ls] || mochaSettings[ls];
        }
    }

    if (compsToRun.length == 0) compsToRun = apiComponents;

    // set browsers to test in
    if (settings.browser === true || settings.browser === 'true') {
        // test default in chrome
        browsers = ['Chrome'];
    } else if (typeof settings.browser == 'string' && settings.browser !== 'false') {
        browsers = settings.browser.split(',');
    }
};

function buildTestWatch() {
    validateFiles();

    var rollupConfigs = require('./rollup.config')({
        mochaSettings,
        sourceFiles,
        compsToRun,
        testFilter,
        environments,
        credentials,
        httpServer
    });

    rollupConfigs.forEach(async (config) => {
        const watchOptions = Object.assign({output: config.output}, config.input);

        const watcher = rollup.watch(watchOptions);

        watcher.on('event', (event) => {
            console.log('Bundle status:', event.code);
        });
    });
};

async function buildTest(done) {
    validateFiles();

    var rollupConfigs = require('./rollup.config')({
        mochaSettings,
        sourceFiles,
        compsToRun,
        testFilter,
        environments,
        credentials,
        httpServer
    });

    let bundles = [];
    let outputConfigs = [];
    let outputs = [];

    rollupConfigs.forEach(async (config) => {
        // create a bundle
        bundles.push(rollup.rollup(config.input));
        outputConfigs.push(config.output);
    });

    (await Promise.all(bundles)).forEach(async (bundle, i) => {
        outputs.push(bundle.write(outputConfigs[i]));
    });

    return Promise.all(outputs);
};

async function runtests(done) {
    await buildTest();

    testReport = {};

    startTests(compsToRun, function(results) {
        for (let cmp in results) {
            var file = 'dist/' + cmp + '/output/report.json';
            var output = JSON.parse(fs.readFileSync(file));

            testReport[cmp] = output;
            testReport[cmp + '-report-path'] = file;
        }
        cleanupServer.close();
        if (done) done();
    }, parallelTest);
};


async function test(cb) {
    // start server for listening to messages that test is cancelled manually(reload page, close browser)
    // the server will clear the spaces that were created by these tests.
    startCleanupServer();
    await runtests(cb);

    console.log('\x1b[32m%s\x1b[0m', 'All components finish!!');

    let error = false;

    for (let i in testReport) {
        if (testReport[i].summary) {
            console.log(i, testReport[i].summary, 'summary');

            if (testReport[i].summary.failed || testReport[i].summary.exitCode || testReport[i].summary.error) {
                error = true;
            }
        }
    }

    if (error) {
        throw Error('tests failed');
    }

    return new Promise(function(resolve) {
        resolve(testReport);
    });
};

// Start tests without building
function startTest(done) {
    getArguments();

    testReport = {};

    startTests(compsToRun, function(results) {
        for (let cmp in results) {
            var file = 'dist/' + cmp + '/output/report.json';
            var output = JSON.parse(fs.readFileSync(file));

            testReport[cmp] = output;
            testReport[cmp + '-report-path'] = file;
        }
        done();
    }, parallelTest);
};


function getConfig(comp, browsers) {
    let config = cfg.parseConfig(path.resolve('./karma.conf.js'));

    config.files.push({pattern: sourceFiles['common-src'], watched: true, served: true, included: true});
    config.files.push({pattern: sourceFiles['core-src'], watched: true, served: true, included: true});
    config.files.push({
        pattern: sourceFiles['display-src'],
        watched: true,
        served: true,
        included: true
    });
    config.files.push({pattern: sourceFiles['editor-src'], watched: true, served: true, included: true});

    let helpers = {
        pattern: 'tests/dist/' + comp + '/' + comp + 'Tests*.js',
        watched: true,
        served: true,
        included: true
    };
    let specs = {
        pattern: 'tests/dist/' + comp + '/specs*.js',
        watched: true,
        served: true,
        included: true
    };

    config.files.push(helpers);
    config.files.push(specs);

    config.customContextFile = './tests/dist/' + comp + '/runner' + comp + '.html';
    config.customDebugFile = './tests/dist/' + comp + '/runner' + comp + '.html';
    config.jsonReporter.outputFile = 'tests/dist/' + comp + '/output/report.json';
    config.htmlReporter.outputDir = 'dist/' + comp + '/output';
    config.browsers = browsers;
    config.singleRun = (settings.singlerun === 'true' || settings.singlerun === true);

    config.basePath = karmaBasePath;

    return config;
}

function cleanReport(comp) {
    var output = 'dist/' + comp + '/output/';

    mkdirp(output, function(e) {
        rimraf(output + '*', function(e) {
            console.log('\x1b[32m%s\x1b[0m', 'Outputs cleaned for ' + comp);
        });
    });
}

function startTests(comps, done, parallel) {
    let finishedTests = 0;
    let testResults = {};

    function startTest(comp, callback) {
        // clean old report
        cleanReport(comp);

        // get configure
        let config = getConfig(comp, browsers);

        let server = new KarmaServer(config, callback);
        server.start();

        // server.addListener('browser_log', function(e, b, c) {
        //     console.log(b, "ffffffff");
        // });
    }

    if (parallel) {
        comps.forEach((comp) => {
            function completed(result) {
                finishedTests++;
                testResults[comp] = result;

                if (finishedTests == comps.length) {
                    done(testResults);
                }
            }

            startTest(comp, completed);
        });
    } else {
        let comp = comps.pop();

        function completed(result) {
            testResults[comp] = result;

            if (comps.length == 0) {
                done(testResults);
            } else {
                comp = comps.pop();

                startTest(comp, completed);
            }
        }

        startTest(comp, completed);
    }
}


let cleanupServer;
function startCleanupServer() {
    cleanupServer = http.createServer().listen(httpServer.port);
    cleanupServer.on('request', (req, response) => {
        let spaces = [];
        req.on('data', (chunk) => {
            spaces.push(chunk);
        }).on('end', () => {
            spaces = Buffer.concat(spaces).toString();
            spaces.split(',').forEach((space) => {
                console.log('cleanup(delete) space', space);
                request.delete({
                    method: 'DELETE',
                    url: environments.xyzhub + '/spaces/' + space,
                    headers: {
                        'Authorization': 'Bearer ' + credentials.access_token
                    }
                });
            });
        });
    });
}

if (argv.test) {
    test();
}

if (argv.buildTest) {
    buildTest();
}

if (argv.buildTestWatch) {
    buildTestWatch();
}
