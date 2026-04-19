const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // This explicitly forces Puppeteer to store the downloaded browser binary 
  // in a local directory inside the project rather than Render's hidden system cache.
  // This ensures the Chrome binary is passed from the Build phase to the Run phase.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
