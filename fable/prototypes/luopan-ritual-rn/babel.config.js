module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // reanimated 插件必须是最后一项
    plugins: ["react-native-reanimated/plugin"],
  };
};
