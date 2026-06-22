import terser from '@rollup/plugin-terser';

const terserOpts = { compress: false, mangle: false, format: { comments: /^\!|@license|@preserve|copyright/i, beautify: true } };

export default [
  {
    input: 'src/HyperFrameset.mjs',
    output: {
      file: 'HyperFrameset.js',
      format: 'iife',
      indent: true,
      sourcemap: true
    },
    treeshake: false,
    plugins: [terser(terserOpts)]
  },
  {
    input: 'src/behaviors.mjs',
    output: {
      file: 'behaviors.js',
      format: 'iife',
      indent: true,
      sourcemap: true
    },
    plugins: [terser(terserOpts)]
  }
];
