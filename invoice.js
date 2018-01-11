
const _ = require("lodash")
const {
    PREMISE_TYPE,
    readTabulatedFile,
    writeToOutput
} =  require("./utils");

function parseHeader(row) {
    const type = row[0].indexOf("кладовка") >= 0 ? PREMISE_TYPE.STORE_HOUSE : PREMISE_TYPE.APPARTMENT; 
    return {
        type,
        fio: row[6],
        id: row[19].split(" ")[2],
        services: []
    };
}

function toFloat(str) {
    return parseFloat(str.replace(" ",""));
}

function parseFooter(row) {
    return {
        incomingBalance: toFloat(row[4]),
        outgoingBalance: toFloat(row[22]),
        accrued: toFloat(row[13]),
        recalculated: toFloat(row[16]),
        paid: toFloat(row[19])
    };
}

function parseServiceRow(row) {
    return {
        name: row[0],
        incomingBalance: toFloat(row[4]),
        outgoingBalance: toFloat(row[22]),
        accrued: toFloat(row[13]),
        recalculated: toFloat(row[16]),
        paid: toFloat(row[19]),
        volume: toFloat(row[9]),
        tariff: toFloat(row[6])
    };
}

function parse(data) {
    return data.reduce((acc, row) => {
        // console.log(row);
        if (row[0].startsWith("СКАНДИНАВСКИЙ")) {
            return {
                current: parseHeader(row),
                accounts: acc.accounts
            }
        }
        if (row[0].startsWith("Итого")) {
            acc.accounts.push(acc.current);
            return {
                accounts: acc.accounts
            }
        }
        acc.current.services.push(parseServiceRow(row));
        return acc;
    }, {
        accounts: []
    }).accounts;
}

async function process() {


    const exportData = (await readTabulatedFile("data/universal-december.txt"))
        .slice(8);
    const significantRows = exportData.findIndex(row =>  row.every(cell => cell.trim() == ""));
    const parsedData = parse(exportData.slice(0, significantRows - 1));
    console.log(parsedData[10]);
}

process()
    .catch(e => console.error(e));

