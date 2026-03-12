'use strict';
require('dotenv').config();

// Register Babel so that pdfGenerator.js (which contains JSX) is compiled on-the-fly.
// Only JSX matters — Node natively supports everything else we use.
require('@babel/register')({
  presets: [['@babel/preset-react', { runtime: 'classic' }]],
  extensions: ['.js'],
  // Ignore ALL node_modules — they are pre-built, only our src files need babel (for JSX in pdfGenerator.js)
  ignore: [(filename) => filename.includes('node_modules')],
});

require('./src/app.js');
