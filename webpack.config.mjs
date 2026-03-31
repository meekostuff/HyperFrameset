import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  entry: './src/HyperFrameset.mjs',
  output: {
    filename: 'HyperFrameset.js',
    path: path.resolve(__dirname),
  },
  mode: 'none',
};
