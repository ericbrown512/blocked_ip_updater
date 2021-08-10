"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const { execSync } = require('child_process');
const db = require('./services/db');
const isCidr = require("is-cidr");
const isIp = require('is-ip');
const IPCIDR = require("ip-cidr");
const ipInt = require('ip-to-int');
const maxInsertSize = 15000;
function handleSubDirectory(dir, repoDir) {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        //Open and processs the sub directory
        const openDir = yield fs.promises.opendir(repoDir + '/' + dir.name);
        try {
            for (var openDir_1 = __asyncValues(openDir), openDir_1_1; openDir_1_1 = yield openDir_1.next(), !openDir_1_1.done;) {
                const dirent = openDir_1_1.value;
                if (!dirent.isDirectory()) {
                    yield handleFile(repoDir + '/' + dir.name, dirent);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (openDir_1_1 && !openDir_1_1.done && (_a = openDir_1.return)) yield _a.call(openDir_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}
function handleFile(path, file) {
    return __awaiter(this, void 0, void 0, function* () {
        //Check if the file is a netset or ipset file
        if (file.name.includes(".netset") || file.name.includes(".ipset")) {
            console.log("Processing file: " + file.name);
            console.log(path + " / " + file.name);
            //Read text from file
            var text = fs.readFileSync(path + '/' + file.name, "utf-8");
            //Split text based on new line
            var split = text.match(/[^\r\n]+/g);
            //Create the base query and param array for inserting records
            const baseQuery = 'INSERT IGNORE INTO blocked_ips (ip_range_start, ip_range_end, source) VALUES';
            var query = baseQuery;
            var paramArray = [];
            //Go through each line of the text
            for (var i in split) {
                var ip = split[i];
                //Check if this line is an ip address
                if (!isIp(ip) && !isCidr(ip)) {
                    continue;
                }
                var ipRangeStart = 0;
                var ipRangeEnd = 0;
                if (isCidr(ip)) {
                    const cidr = new IPCIDR(ip);
                    ipRangeStart = ipInt(cidr.start()).toInt();
                    ipRangeEnd = ipInt(cidr.end()).toInt();
                }
                else {
                    ipRangeStart = ipInt(ip).toInt();
                    ipRangeEnd = ipInt(ip).toInt();
                }
                //Add to parameters array
                if (ipRangeStart > 0 && ipRangeEnd > 0) {
                    //Add to inert query
                    query += '(?,?,?),';
                    paramArray.push(ipRangeStart);
                    paramArray.push(ipRangeEnd);
                    paramArray.push(file.name);
                }
                //If query gets above record maxInsetSize, submit the query and start building a new one
                //Max insert size is *3 because of the number of params per record insert
                if (paramArray.length > maxInsertSize * 3) {
                    //Remove last comma from query and close with ;
                    query = query.substr(0, query.length - 1) + ';';
                    //Submit query and await result
                    var queryResult = yield db.query(query, paramArray);
                    console.log("Query submitted for file: " + file.name);
                    console.log(queryResult);
                    //Reset query and params array
                    query = baseQuery;
                    paramArray = [];
                }
            }
            if (paramArray.length > 0) {
                //Remove last comma from query and close with ;
                query = query.substr(0, query.length - 1) + ';';
                //Submit query and await result
                var queryResult = yield db.query(query, paramArray);
                console.log("Query submitted for file: " + file.name);
                console.log(queryResult);
            }
            console.log("Finished processing file: " + file.name);
        }
    });
}
function runUpdate(rootDir, repoDir, repoURL) {
    var e_2, _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var startTime = new Date();
            //Cleans out tmp directory
            execSync('rm -rf ' + rootDir + '/*', { encoding: 'utf8', stdio: 'inherit' });
            //Clones the firehol IP address repo
            execSync('git clone ' + repoURL + ' ' + repoDir, { encoding: 'utf8', stdio: 'inherit' });
            //Open and process the cloned directory
            const openDir = yield fs.promises.opendir(repoDir);
            try {
                for (var openDir_2 = __asyncValues(openDir), openDir_2_1; openDir_2_1 = yield openDir_2.next(), !openDir_2_1.done;) {
                    const dirent = openDir_2_1.value;
                    console.log(dirent);
                    if (dirent.isDirectory()) {
                        // try {
                        //     await handleSubDirectory(dirent, repoDir);
                        // } catch (ex) {
                        //     console.log("Error processing file: "+dirent.name);
                        // }
                    }
                    else {
                        try {
                            yield handleFile(repoDir, dirent);
                        }
                        catch (ex) {
                            console.log("Error processing file: " + dirent.name);
                        }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (openDir_2_1 && !openDir_2_1.done && (_a = openDir_2.return)) yield _a.call(openDir_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
            var b = new Date();
            var difference = (new Date().getTime() - startTime.getTime());
        }
        catch (err) {
            console.error(`Error: `, err.message);
            return false;
        }
        finally {
            console.log("Finished updating IP addresses: " + new Date(difference).toISOString().slice(11, 19));
            return true;
        }
    });
}
module.exports = {
    runUpdate
};
//# sourceMappingURL=updater.js.map