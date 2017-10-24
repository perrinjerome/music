/*globals module, require, __dirname */
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const GitRevisionPlugin = require('git-revision-webpack-plugin');
const path = require('path');

const gitVersion = JSON.stringify(new GitRevisionPlugin().version());

const config = {
  // Entry points to the project
  entry: {
    main: ['./src/app.js']
  },
  devServer: {
    contentBase: './static/',
    hot: true,
    inline: true,
    host: '0.0.0.0'
  },
  devtool: 'inline-source-map',
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: '[name].[hash].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: [
          {
            loader: 'jshint-loader'
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ],
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ['file-loader']
      }
    ]
  },

  plugins: [
    new CleanWebpackPlugin(['public']),
    new webpack.DefinePlugin({
      VERSION: gitVersion
    }),
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      template: './static/index.html',
      VERSION: gitVersion
    }),
    new CopyWebpackPlugin([{ from: './static' }])
  ]
};

module.exports = config;
