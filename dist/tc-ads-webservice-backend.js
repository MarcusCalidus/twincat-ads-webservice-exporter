"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Yaml = __importStar(require("yamljs"));
const path = __importStar(require("path"));
const rxjs_1 = require("rxjs");
const tc_ads_webservice_1 = require("./tc-ads-webservice");
const operators_1 = require("rxjs/internal/operators");
const operators_2 = require("rxjs/operators");
const utils_1 = require("tslint/lib/utils");
var TcAdsReservedIndexGroups = tc_ads_webservice_1.TcAdsWebService.TcAdsReservedIndexGroups;
var InternalError = tc_ads_webservice_1.TcAdsWebService.InternalError;
class TcAdsWebserviceBackend {
    constructor() {
        this.symbolHandles = {};
        const configFile = path.join(__dirname, '../config/webservice.yaml');
        console.log('loading config from ', configFile);
        this.config = Yaml.load(configFile);
        console.log('config loaded with ', this.config.targets.length, ' targets');
        this.client = new tc_ads_webservice_1.TcAdsWebService.Client(this.config.url, this.config.username, this.config.password);
    }
    getSymbolValues(sNetId, nPort, aSymbols) {
        return this.getSymbolHandles(sNetId, nPort, aSymbols)
            .pipe(operators_2.flatMap((symbolHandles) => {
            const readSymbolValuesWriter = new tc_ads_webservice_1.TcAdsWebService.DataWriter();
            let requestSize = 0;
            Object.entries(symbolHandles).forEach(([symbol, handle]) => {
                readSymbolValuesWriter.writeDINT(tc_ads_webservice_1.TcAdsWebService.TcAdsReservedIndexGroups.SymbolValueByHandle);
                readSymbolValuesWriter.writeDINT(handle); // IndexOffset = The target handle
                readSymbolValuesWriter.writeDINT(TcAdsWebserviceBackend.getSizeOfType(aSymbols[symbol])); // Size to read;
                requestSize += TcAdsWebserviceBackend.getSizeOfType(aSymbols[symbol]);
            });
            const readSymbolValuesData = readSymbolValuesWriter.getBase64EncodedData();
            return new rxjs_1.Observable(subscriber => {
                this.client.readwrite(sNetId, nPort, TcAdsReservedIndexGroups.SymbolValuesByHandleList, // 0xF080 = Read command;
                Object.entries(symbolHandles).length, // IndexOffset = Variables count;
                requestSize + (Object.entries(symbolHandles).length * 4), // Length of requested data + 4 byte errorcode per variable;
                readSymbolValuesData, (resp) => {
                    if (resp.hasError) {
                        subscriber.error(resp.error);
                    }
                    const reader = resp.reader;
                    // Read error code and each symbol;
                    Object.entries(aSymbols).forEach(symbol => {
                        const err = reader.readDWORD();
                        if (err !== 0) {
                            subscriber.error(`Error Code ${err} while retrieving handle for ${symbol}`);
                        }
                    });
                    const symbolValues = {};
                    Object.entries(aSymbols).forEach(([symbol, type]) => {
                        symbolValues[symbol] = TcAdsWebserviceBackend.readValue(reader, type);
                    });
                    subscriber.next(symbolValues);
                    subscriber.complete();
                }, null, this.readTimeout, error => subscriber.error(error));
            });
        }));
    }
    getSymbolHandles(sNetId, nPort, aSymbols) {
        return new rxjs_1.Observable(subscriber => {
            if (!this.symbolHandles[sNetId]) {
                this.symbolHandles[sNetId] = {};
            }
            if (!this.symbolHandles[sNetId][nPort]) {
                this.symbolHandles[sNetId][nPort] = {};
            }
            const unknownSymbols = [];
            Object.entries(aSymbols).forEach(([symbol]) => {
                if (!this.symbolHandles[sNetId][nPort][symbol]) {
                    unknownSymbols.push(symbol);
                }
            });
            if (Object.entries(aSymbols).length > 0) {
                const handleswriter = new tc_ads_webservice_1.TcAdsWebService.DataWriter();
                unknownSymbols.forEach(symbol => {
                    handleswriter.writeDINT(tc_ads_webservice_1.TcAdsWebService.TcAdsReservedIndexGroups.SymbolHandleByName);
                    handleswriter.writeDINT(0);
                    handleswriter.writeDINT(4); // Expected size; A handle has a size of 4 byte;
                    handleswriter.writeDINT(symbol.length); // The length of the symbol name string;
                });
                unknownSymbols.forEach(symbol => {
                    handleswriter.writeString(symbol, symbol.length);
                });
                this.client.readwrite(sNetId, nPort, TcAdsReservedIndexGroups.SymbolHandlesByNameList, unknownSymbols.length, // IndexOffset = Count of requested symbol handles;
                (unknownSymbols.length * 4) + (unknownSymbols.length * 8), // Length of requested data + 4 byte errorcode and 4 byte length per twincat symbol;
                handleswriter.getBase64EncodedData(), (resp) => {
                    if (resp.hasError) {
                        subscriber.error(resp.error);
                    }
                    const reader = resp.reader;
                    // Read error code and length for each handle;
                    unknownSymbols.forEach(symbol => {
                        const err = reader.readDWORD();
                        reader.readDWORD(); // read len and discard
                        if (err !== 0) {
                            subscriber.error(`Error Code ${err} while retrieving handle for ${symbol}`);
                        }
                    });
                    unknownSymbols.forEach(symbol => {
                        this.symbolHandles[sNetId][nPort][symbol] = reader.readDWORD();
                    });
                    const resultHandles = {};
                    Object.entries(aSymbols).forEach(([symbol]) => {
                        resultHandles[symbol] = this.symbolHandles[sNetId][nPort][symbol];
                    });
                    subscriber.next(resultHandles);
                    subscriber.complete();
                }, null, this.readTimeout, error => subscriber.error(error));
            }
        });
    }
    getValues() {
        const observables = [];
        this.config.targets.forEach(target => observables.push(this.handleTarget(target)));
        return rxjs_1.merge(...observables)
            .pipe(operators_1.groupBy((value) => value.metric.name), operators_1.mergeMap(group => group.pipe(operators_1.toArray())), operators_1.toArray());
    }
    static getSizeOfType(type) {
        switch (type) {
            case 'int':
                return 2;
            case 'byte':
                return 1;
            case 'sint':
                return 1;
            case 'dint':
                return 4;
            case 'word':
                return 2;
            case 'dword':
                return 4;
            case 'bool':
                return 1;
            case 'real':
                return 4;
            case 'lreal':
                return 8;
            default:
                return 1;
        }
    }
    static readValue(reader, type) {
        switch (type) {
            case 'int':
                return reader.readINT();
            case 'byte':
                return reader.readBYTE();
            case 'sint':
                return reader.readSINT();
            case 'dint':
                return reader.readDINT();
            case 'word':
                return reader.readWORD();
            case 'dword':
                return reader.readDWORD();
            case 'bool':
                return reader.readBOOL();
            case 'real':
                return reader.readREAL();
            case 'lreal':
                return reader.readLREAL();
        }
    }
    handleTarget(target) {
        const requestSymbols = {};
        const symbolMetrics = {};
        const symbolLabels = {};
        target.metrics.forEach((metric) => {
            if (utils_1.hasOwnProperty(metric, 'symbol')) {
                requestSymbols[metric.symbol] = metric.datatype;
                symbolMetrics[metric.symbol] = metric;
                symbolLabels[metric.symbol] = [];
                if (target.label) {
                    symbolLabels[metric.symbol].push(target.label);
                }
            }
            else if (utils_1.hasOwnProperty(metric, 'multiple')) {
                metric.multiple.forEach(mmetric => {
                    requestSymbols[mmetric.symbol] = metric.datatype;
                    symbolMetrics[mmetric.symbol] = metric;
                    symbolLabels[mmetric.symbol] = [];
                    if (mmetric.label) {
                        symbolLabels[mmetric.symbol].push(mmetric.label);
                    }
                    if (target.label) {
                        symbolLabels[mmetric.symbol].push(target.label);
                    }
                });
            }
        });
        return this.getSymbolValues(target.netId, target.port, requestSymbols)
            .pipe(operators_2.flatMap(obj => {
            const result = [];
            Object.entries(obj).forEach(([symbol, value]) => result.push({
                metric: symbolMetrics[symbol],
                label: symbolLabels[symbol],
                value
            }));
            return result;
        }), operators_1.catchError((error) => {
            if (error instanceof InternalError) {
                console.error('InternalError', target.netId, target.port, error.errorMessage, error.errorCode);
            }
            else {
                console.error('Generic Error: ', JSON.stringify(error));
            }
            return rxjs_1.EMPTY;
        }));
    }
}
exports.TcAdsWebserviceBackend = TcAdsWebserviceBackend;
//# sourceMappingURL=tc-ads-webservice-backend.js.map