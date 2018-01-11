const fs = require("fs");
const _ = require("lodash");
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

async function readTxt(file) {
    return await readFile(file);
}

async function writeTxt(file, data) {
    return await writeFile(file, data);
}


const PREMISE_TYPE = {
    APPARTMENT: "APPARTMENT",
    STORE_HOUSE: "STORE_HOUSE"
};

function parseTextToArray(txt) {
    return txt
        .toString()
        .replace("\r","") 
        .split("\n")
        .map( row => {
            return row.split("\t");
        })
        .filter(row => row && row.some(c => c !== ""))
}

async function writeToOutput(data, file) {
    const rawData = data
        .map(row => row.join("\t"))
        .join("\n");
    await writeTxt(file, rawData);
}

async function readTabulatedFile(file) {
    return parseTextToArray(await readTxt(file));
}

module.exports = {
    PREMISE_TYPE,
    readTxt,
    writeTxt,
    parseTextToArray,
    readTabulatedFile,
    writeToOutput
};