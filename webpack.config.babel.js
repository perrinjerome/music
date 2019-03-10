import {
  DefinePlugin,
  optimize,
  HotModuleReplacementPlugin,
  Configuration
} from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CleanWebpackPlugin from "clean-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import GitRevisionPlugin from "git-revision-webpack-plugin";
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

import { resolve } from "path";

const gitVersion = JSON.stringify(
  new GitRevisionPlugin({ versionCommand: "log -1 --oneline" }).version()
);

/** @type Configuration */
const config = {
  // Entry points to the project
  entry: {
    main: "./src/app.js"
  },
  devServer: {
    contentBase: "./static/",
    hot: true,
    inline: true,
    open: true
  },
  devtool: "inline-source-map",
  output: {
    path: resolve(__dirname, "public"),
    filename: "[name].js"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: "pre",
        exclude: /node_modules/,
        use: ["babel-loader"]
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: ["file-loader"]
      }
    ]
  },

  plugins: [
    new CleanWebpackPlugin(["public"]),
    new DefinePlugin({
      VERSION: gitVersion
    }),
    new HtmlWebpackPlugin({
      template: "./static/index.html",
      VERSION: gitVersion
    }),
    new CopyWebpackPlugin([{ from: "./static" }])
  ]
};

if (process.env.NODE_ENV === "production") {
  config.optimization = {
    splitChunks: {
      chunks: "all"
    },
    minimizer: [
      new UglifyJsPlugin({
        sourceMap: true
      })
    ]
  };
  config.plugins.push(
    new DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    })
  );
} else {
  config.plugins.push(new HotModuleReplacementPlugin());
}

export default config;
