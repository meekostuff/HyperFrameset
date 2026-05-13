import terser from '@rollup/plugin-terser';

export default {
  input: 'src/HyperFrameset.mjs',
  output: {
    file: 'HyperFrameset.js',
    format: 'iife',
    indent: true,
    sourcemap: true
  },
  treeshake: false,
  plugins: [
    terser({ compress: false, mangle: false, format: { comments: /^\!|@license|@preserve|copyright/i, beautify: true } })
  ]
};
