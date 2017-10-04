const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const path = require('path');

const config = {
  // Entry points to the project
  entry: {
    main: [
      './public/js/app.js',
    ],
  },
  devServer: {
    contentBase: './public/',
    hot: true,
    inline: true,
  },
  devtool: 'eval',
  output: {
    path: path.resolve(__dirname, 'dist'),
    //publicPath: "build/",
     filename: '[name].[hash].js',
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
    new CleanWebpackPlugin(['dist']),
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({template: './public/index.html'})
  ]

};

module.exports = config;
