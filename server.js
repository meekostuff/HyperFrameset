const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const TEMPLATE_EXT = 'ehtml';
const DOCUMENT_ROOT = __dirname;

app.set('view engine', TEMPLATE_EXT);
app.engine(TEMPLATE_EXT, require('ejs').renderFile);
app.set('views', DOCUMENT_ROOT);
app.use(express.urlencoded({ extended: true }));

// Auto-route all .ehtml files anywhere - BEFORE static middleware
app.all(`*.${TEMPLATE_EXT}`, (req, res) => {
  const fullPath = req.path.substring(1); // remove leading slash
  const template = fullPath.replace(`.${TEMPLATE_EXT}`, '');
  const data = req.method === 'GET' ? { query: req.query } : { body: req.body };
  console.log('Template:', template, 'Data:', data);
  res.render(template, data);
});

// Static files AFTER template routing
app.use(express.static(DOCUMENT_ROOT));

const port = 3000;
app.listen(port, () => console.log(`Demo server running on http://localhost:${port}`));
