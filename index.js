require('dotenv').config()

const updater = require('./dist/updater');

exports.handler = async (event) => {

    console.log("Update Running");

    const repoURL = 'https://github.com/firehol/blocklist-ipsets.git';
    const rootDir = '/tmp'
    const repoDir = rootDir+'/firehol';


    var success = await updater.runUpdate(rootDir, repoDir, repoURL);

    if(success) {
        return {
            statusCode: 200,
            body: JSON.stringify('Sucessfully updated ip database!'),
        };
    } else {
        return {
            statusCode: 500,
            body: JSON.stringify('Error while updating!'),
        };
    }

};
