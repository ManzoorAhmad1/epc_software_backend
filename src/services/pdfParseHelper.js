'use strict';
// Plain CommonJS wrapper so TypeScript/ts-node never touches pdf-parse's exports directly
const pdfParse = require('pdf-parse');
module.exports = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
