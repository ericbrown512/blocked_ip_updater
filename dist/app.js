require('dotenv').config();
const updater = require('./updater');
const repoURL = 'https://github.com/firehol/blocklist-ipsets.git';
const rootDir = './tmp';
const repoDir = rootDir + '/firehol';
updater.runUpdate(rootDir, repoDir, repoURL);
//# sourceMappingURL=app.js.map