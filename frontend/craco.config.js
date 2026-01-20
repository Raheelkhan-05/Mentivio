module.exports = {
  webpack: {
    configure: (config) => {
      config.optimization.minimize = false;
      return config;
    },
  },
};
