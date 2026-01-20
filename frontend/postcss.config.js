module.exports = {
  plugins: {
    'postcss-preset-env': {
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-properties': true
      }
    },
    'cssnano': {
      preset: ['default', {
        calc: false, // Disable calc optimization
        cssDeclarationSorter: false
      }]
    }
  }
}