const fs = require('fs')
const { execSync } = require('child_process')
const db = require('./services/db');
const isCidr = require("is-cidr");
const isIp = require('is-ip');

const repo = 'https://github.com/firehol/blocklist-ipsets.git';
const destinationFolder = './tmp'
const destination = destinationFolder+'/firehol';

async function handleSubDirectory(dir) {

    //Open and processs the sub directory
    const openDir = await fs.promises.opendir(destination +'/'+dir.name);
    for await (const dirent of openDir) {

        if(!dirent.isDirectory()) {
            await handleFile(destination+'/'+dir.name, dirent);
        }

    }

}

async function handleFile(path, file) {

    //Check if the file is a netset or ipset file
    if(file.name.includes(".netset") || file.name.includes(".ipset")) {

        console.log("Processing file: "+file.name)
        console.log(path + " / " + file.name)

        //Read text from file
        var text = fs.readFileSync(path +'/'+file.name, "utf-8");

        //Split text based on new line
        var split = text.match(/[^\r\n]+/g);

        //Create the base query and param array for inserting records
        const baseQuery = 'INSERT IGNORE INTO blocked_ips (ip, block_source) VALUES';
        var query = baseQuery;
        var paramArray = [];

        //Go through each line of the text
        for(var i in  split) {
            var ip = split[i];

            //Check if this line is an ip address
            if(isCidr(ip) || isIp(ip)) {

                //Add to inert query
                query += '(?, ?),';

                //Add to parameters array
                paramArray.push(ip);
                paramArray.push(file.name);
            }

            //If query gets above 500 records, submit the query and start building a new one
            if(paramArray.length > 1000) {

                //Remove last comma from query and close with ;
                query = query.substr(0, query.length-1) + ';';

                //Submit query and await result
                var queryResult = await db.query(query,paramArray);
                console.log("Query submitted for file: "+file.name);
                console.log(queryResult);

                //Reset query and params array
                query = baseQuery;
                paramArray = [];
            }

        }

        if(paramArray.length > 0) {

            //Remove last comma from query and close with ;
            query = query.substr(0, query.length-1) + ';';

            //Submit query and await result
            var queryResult = await db.query(query,paramArray);
            console.log("Query submitted for file: "+file.name);
            console.log(queryResult);

        }

        console.log("Finished processing file: "+file.name);


    }
}

exports.handler = async (event) => {

    try {

        //Cleans out tmp directory
        //execSync('rm -rf '+destinationFolder+'/*', { encoding: 'utf8', stdio: 'inherit' })

        //Clones the firehol IP address repo
        //execSync('git clone ' + repo + ' ' + destination, { encoding: 'utf8', stdio: 'inherit' })

        //Open and process the cloned directory
        const openDir = await fs.promises.opendir(destination);
        for await (const dirent of openDir) {

            console.log(dirent);

            if(dirent.isDirectory()) {
                await handleSubDirectory(dirent);
            } else {
                await handleFile(destination, dirent);
            }

        }

    } catch (err) {
        console.error(`Error: `, err.message);
    }

    console.log("Finished updating IP addresses")
};
