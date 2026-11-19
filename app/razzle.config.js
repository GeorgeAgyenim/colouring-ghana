const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack')

module.exports = {
    plugins: [
        {
            name: 'typescript',
            options: {
                forkTsChecker: {
                    eslint: undefined // { files: './src/**/*.{ts,tsx,js,jsx}' }
                },
            },
        },
    ],
    modifyWebpackConfig({ env: { target, dev }, webpackConfig }) {
        // load webfonts
        webpackConfig.module.rules = webpackConfig.module.rules || [];
        webpackConfig.module.rules.push({
            test: /\.(eot|svg|ttf|woff|woff2)$/,
            type: 'asset/resource'
        });

        // add the map_styles directory to the build output
        const plugins = webpackConfig.plugins || [];
        plugins.push(new CopyPlugin({
            patterns: [ {from: 'map_styles', to: 'map_styles'}]
        }));
        plugins.push(new webpack.DefinePlugin({
            'process.env.SUBDIRECTORY': JSON.stringify(process.env.SUBDIRECTORY),
        }));
        webpackConfig.plugins = plugins;

        // Production builds only: the addresses of the built scripts and styles start at the site's base
        // path (SUBDIRECTORY, for example /colouringghana), so they load when the site is served from a
        // sub-path. This one value sets the addresses written to build/assets.json (which the page shell in
        // src/frontendRoute.tsx links) and the address the browser loads later parts of the app from, such
        // as the map. It is set for the client and the server build so both agree. With SUBDIRECTORY unset
        // it is '/', razzle's default. A slash at the end of SUBDIRECTORY is dropped here so the address
        // never contains '//'; the rest of the app uses SUBDIRECTORY as given, so set it without one.
        // The development server keeps razzle's own address (its asset server on a separate port).
        // Ticket: docs/tickets/location-search/issues/11-asset-addresses-carry-the-base-path.md
        if (!dev) {
            webpackConfig.output.publicPath = (process.env.SUBDIRECTORY ?? '').replace(/\/+$/, '') + '/';
        }

        return webpackConfig;
    },
};
