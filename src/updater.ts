import {start} from "repl";

const fs = require('fs')
const { execSync } = require('child_process')
const db = require('./services/db');
const isCidr = require("is-cidr");
const isIp = require('is-ip');
const IPCIDR = require("ip-cidr");
const ipInt = require('ip-to-int');

const maxInsertSize = 15000;

async function handleSubDirectory(dir, repoDir: String) {

    //Open and processs the sub directory
    const openDir = await fs.promises.opendir(repoDir +'/'+dir.name);
    for await (const dirent of openDir) {

        if(!dirent.isDirectory()) {
            await handleFile(repoDir+'/'+dir.name, dirent);
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
        const baseQuery = 'INSERT IGNORE INTO blocked_ips (ip_range_start, ip_range_end, source) VALUES';
        var query = baseQuery;
        var paramArray = [];

        //Go through each line of the text
        for(var i in  split) {
            var ip = split[i];

            //Check if this line is an ip address
            if(!isIp(ip) && !isCidr(ip)) {
                continue;
            }

            var ipRangeStart = 0;
            var ipRangeEnd = 0;
            if(isCidr(ip)) {

                const cidr = new IPCIDR(ip);

                ipRangeStart = ipInt(cidr.start()).toInt();
                ipRangeEnd = ipInt(cidr.end()).toInt();

            } else {

                ipRangeStart = ipInt(ip).toInt();
                ipRangeEnd = ipInt(ip).toInt();

            }

            //Add to parameters array
            if(ipRangeStart > 0 && ipRangeEnd > 0) {
                //Add to inert query
                query += '(?,?,?),';

                paramArray.push(ipRangeStart);
                paramArray.push(ipRangeEnd);
                paramArray.push(file.name);
            }


            //If query gets above record maxInsetSize, submit the query and start building a new one
            //Max insert size is *3 because of the number of params per record insert
            if(paramArray.length > maxInsertSize*3) {

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

async function runUpdate(rootDir: String, repoDir: String, repoURL: String) {

    try {

        var startTime = new Date();

        //Cleans out tmp directory
        execSync('rm -rf '+rootDir+'/*', { encoding: 'utf8', stdio: 'inherit' })

        //Clones the firehol IP address repo
        execSync('git clone ' + repoURL + ' ' + repoDir, { encoding: 'utf8', stdio: 'inherit' })

        //Open and process the cloned directory
        const openDir = await fs.promises.opendir(repoDir);
        for await (const dirent of openDir) {

            console.log(dirent);

            if(dirent.isDirectory()) {
                //I dont think the sets in the folders should be included?
                // try {
                //     await handleSubDirectory(dirent, repoDir);
                // } catch (ex) {
                //     console.log("Error processing file: "+dirent.name);
                // }
            } else {
                try {
                    await handleFile(repoDir, dirent);
                } catch (ex) {
                    console.log("Error processing file: "+dirent.name);
                }
            }

        }

        var b = new Date();
        var difference = (new Date().getTime() - startTime.getTime());

    } catch (err) {

        console.error(`Error: `, err.message);
        return false;

    } finally {

        console.log("Finished updating IP addresses: "+new Date(difference).toISOString().slice(11,19));
        return true;

    }

}

module.exports = {
    runUpdate
}

