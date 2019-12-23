module.exports = function(config) {
    config.set({
        browsers: ['Chrome'],

        customLaunchers: {
            ChromeHeadlessV: {
                base: 'ChromeHeadless',
                flags: ['--window-size=1280,1024', '--no-sandbox']
            }
        },

        frameworks: ['mocha', 'chai'],

        files: [
            // {pattern: './xyz-maps/xyz-maps-common.min.js', watched: true, served: true, included: true, nocache: true},
            // {pattern: './core/dist/xyz-maps-core.min.js', watched: true, served: true, included: true, nocache: true},
            // {pattern: './display/dist/xyz-maps-display.min.js', watched: true, served: true, included: true, nocache: true},
            // {pattern: './editor/dist/xyz-maps-editor.min.js', watched: true, served: true, included: true, nocache: true}

            {pattern: 'assets/tiles/*.png', watched: false, included: false, served: true}
            // ,{pattern: './tests/dist/core/coreTests*.js', watched: true, served: true, included: true, nocache: true},
            // {pattern: './tests/dist/core/specs*.js', watched: true, served: true, included: true, nocache: true}
        ],

        // basePath: '../',

        client: {
            clearContext: false,
            captureConsole: false,
            mocha: {
                // change Karma's debug.html to the mocha web reporter
                reporter: 'html',

                // custom ui, defined in required file above
                ui: 'bdd'
            }
        },

        // customContextFile: './tests/dist/core/runnercore.html',

        reporters: ['progress', 'html', 'json'],

        jsonReporter: {
            stdout: false,
            outputFile: 'tests/dist/core/report/report.json' // defaults to none
        },

        htmlReporter: {
            outputDir: 'dist/core/report', // where to put the reports
            focusOnFailures: true, // reports show failures on start
            namedFiles: false, // name files instead of creating sub-directories
            pageTitle: null, // page title for reports; browser info by default
            urlFriendlyName: false // simply replaces spaces with _ for files/dirs
        },

        singleRun: false,

        plugins: [
            'karma-mocha',
            'karma-chai',
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-json-reporter',
            'karma-html-reporter'
        ]
    });
};
