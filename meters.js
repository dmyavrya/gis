

//const fs = require("fs");
const _ = require("lodash")
// const util = require('util');
// const readFile = util.promisify(fs.readFile);
// const writeFile = util.promisify(fs.writeFile);

const {
    readTxt,
    writeTxt,
    parseTextToArray,
    readTabulatedFile,
    writeToOutput,
    PREMISE_TYPE
} =  require("./utils");


const METER_TYPE = {
    COLD_WATER: "Холодная вода",
    HOT_WATER: "Горячая вода",
    HEAT: "Тепловая энергия"
}

function parseAddress(address) {
    const [type, no] = address
        .replace("\r","")
        .split(", ")
        .pop()
        .split(". ");
    return {
        type,
        no
    }
}

function parseAccountRow(row) {
    const address = row.pop();
    const {type, no} = parseAddress(address);
    return  {
        id: row[0],
        gisId: row[1],
        zhkhId: row[2],
        premiseId: row[3],
        premiseType: type == "пом" ? PREMISE_TYPE.STORE_HOUSE : PREMISE_TYPE.APPARTMENT,
        premiseNo: parseFloat(no)
    };
}

function parseMeter(data, houseNo, commissioningDate, type) {
    [ brand, model, serial, initialReading, verificationDate, sealNo, nextVerficaitionDate ] = data;
    return {
        type,
        houseNo: parseInt(houseNo),
        commissioningDate,
        brand,
        model,
        serial,
        initialReading,
        verificationDate,
        sealNo,
        nextVerficaitionDate
    }

}

function parseWaterMeterRow(row) {
    const houseNo = row[0];
    const commissioningDate = row[2];
    const meterInfoDataLength = 7;
    return _.range(4)
        .map(i => {
            const ii = 3 + i * meterInfoDataLength;
            const data = row.slice(ii, ii + meterInfoDataLength);
            type = ii % 2 ? METER_TYPE.HOT_WATER : METER_TYPE.COLD_WATER;
            return parseMeter(data, houseNo, commissioningDate, type);
        })
        .filter(meter => meter.serial !== "")

}

function parseHeatMeterRow(row) {
    const houseNo = row[0];
    const commissioningDate = row[1];
    const meterInfoDataLength = 7;
    return _.range(3)
        .map(i => {
            const ii = 2 + i * meterInfoDataLength;
            const data = row.slice(ii, ii + meterInfoDataLength);
            return parseMeter(data, houseNo, commissioningDate, METER_TYPE.HEAT);
        })
        .filter(meter => meter.serial !== "")

}


async function processAccounts() {
    const data = await readTabulatedFile("data/accounts.txt");
    data.shift();
    return data.map(parseAccountRow);
}

async function processExport() {
    const data = await readTabulatedFile("data/export.txt");
    return data
        .slice(2)
        .map(row => {
            return {
                serial: row[1],
                meterGisId: row[4],
                houseNo: row[17]
            }
        })
    
}

async function precessWaterMeters() {
    const data = await readTabulatedFile("data/water_meters.txt");
    return _(data.slice(2))
        .map(parseWaterMeterRow)
        .flatten()
        .value();
}

async function precessHeatMeters() {
    const data = await readTabulatedFile("data/heat_meters.txt");
    return _(data.slice(2))
        .map(parseHeatMeterRow)
        .flatten()
        .value();
}

function joinData(meters, accounts, exportData) {
    console.log(exportData);
    accounts = accounts.filter(a => a.premiseType === PREMISE_TYPE.APPARTMENT);
    return meters
        .map(m => {
            const account = accounts.find(a => a.premiseNo == m.houseNo);
            const exportRow = exportData.find(e => e.serial == m.serial && e.houseNo == m.houseNo);
            const isSingleMeter = meters.filter(mm => mm.premiseNo === m.premiseNo && mm.type === m.type).length === 1;
            return Object.assign({}, m, {
                account,
                isSingleMeter,
                meterGisId: exportRow ? exportRow.meterGisId : ""
            });
        });
}

function validateMeters(meters) {
    meters.forEach(m => {
        const duplicates = meters.filter(mm => mm.serial === m.serial)
        if (duplicates.length > 1) {
            console.error("duplicated serial for meters", duplicates);
        }
    })
}

function convertToOutput(data) {
    return data
        .map(m => {
            return [
                m.serial,
                "Индивидуальный",
                m.brand,
                m.model,
                "", //адрес дома
                "", //номер дома
                m.account.premiseId,
                "", // номер комнаты
                m.account.gisId, // крц id
                "нет", //дистанционное снятие
                "", // инфа о дистанционном снятии
                "нет", // не понятно            //m.isSingleMeter ? "нет" : "да",
                "", // не понятно
                "", // связь с другим ПУ
                m.type,
                "",
                m.initialReading, // последнее показание. сейчас неправильно
                "",
                "",
                "", // коэфф трансформации
                "", // дата установки
                m.commissioningDate,
                "", // дата поверки
                "", // дата опломбировки изготовителем
                m.type === METER_TYPE.HEAT ? "4 года" : "6 лет",
                m.type === METER_TYPE.HEAT ? "да" : "нет", // датчик температуры
                "",
                "нет",
                "",
                m.meterGisId
            ]
        });
}

function convertToMetersValues(data) {
    return data
        .map(m => {
            return [
                "",
                m.meterGisId,
                m.type
            ]
        });
}

// async function writeToOutput(data, file) {
//     const rawData = data
//         .map(row => row.join("\t"))
//         .join("\n");
//     await writeTxt(file, rawData);
// }

async function process() {
    const exportData = await processExport();
    const accounts = await processAccounts();
    const waterMeters = await precessWaterMeters();
    const heatMeters = await precessHeatMeters();
    const meters = [...waterMeters, ...heatMeters]
    //validateMeters(meters);
    const data = joinData(meters, accounts, exportData)
        .filter(m => m.houseNo == 60)
        ;
    await writeToOutput(convertToOutput(data), "data/results.txt");
    await writeToOutput(convertToMetersValues(data), "data/results_values.txt");
    //console.log(meters);
    //console.log(accounts);
    //console.log(data);
}

process()
    .catch(e => console.error(e));

