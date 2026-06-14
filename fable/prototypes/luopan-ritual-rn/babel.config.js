module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // reanimated 4 起 worklets 拆为独立包，babel 插件改用 worklets 的，且必须是最后一项
    plugins: ["react-native-worklets/plugin"],
  };
};
