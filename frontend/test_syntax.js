const fs = require('fs');
const babel = require('@babel/core');

const files = [
  'src/pages/Import.jsx',
  'src/pages/Home.jsx',
  'src/pages/MapPage.jsx',
  'src/components/ComponentErrorBoundary.jsx',
  'src/contexts/AuthContext.jsx'
];

files.forEach(f => {
  try {
    babel.transformFileSync(f, {
      presets: ['@babel/preset-react'],
      plugins: ['@babel/plugin-syntax-jsx']
    });
    console.log(f, 'OK');
  } catch (e) {
    console.log(f, 'ERROR', e.message);
  }
});
