const webpack = require('webpack');
const path = require('path');

const config = {
  // Entry points to the project
  entry: {
    main: [
      // only- means to only hot reload for successful updates
//      'webpack/hot/only-dev-server',
      './public/js/app.js',
    ],
  },
  // Server Configuration options
  devServer: {
    contentBase: './public/',
    hot: true,
    inline: true,
//    port: 3000, // Port Number
//    host: 'localhost', // Change to '0.0.0.0' for external facing server
  },
  devtool: 'eval',
  output: {
    path: path.resolve(__dirname, 'public/build'), // Path of output file
    publicPath: "/assets/",
    filename: 'app.js',
  },
   module: {
     rules: [{
      test: /\.js$/,
      enforce: "pre",
       exclude: /node_modules/,
       use: [{
         loader: "jshint-loader"
       }]
     }],
     loaders: [{
         test: /\.js$/,
         exclude: /node_modules/,
         loader: 'babel-loader'
     }]
   },

  plugins: [
    // Enables Hot Modules Replacement
    new webpack.HotModuleReplacementPlugin(),
    ]

};

module.exports = config;
