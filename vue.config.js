const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  publicPath: '/legislator-election-24/',
  transpileDependencies: true,
  devServer: {
    port: 8080,
    host: 'localhost',
  },
});
