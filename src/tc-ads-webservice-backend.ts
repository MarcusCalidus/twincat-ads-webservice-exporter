import * as Yaml from 'yamljs';
import * as path from 'path';
import {EMPTY, merge, Observable} from 'rxjs';
import {TcAdsWebService} from './tc-ads-webservice';
import {catchError, groupBy, mergeMap, toArray} from 'rxjs/internal/operators';
import {flatMap} from 'rxjs/operators';
import {hasOwnProperty} from 'tslint/lib/utils';
import TcAdsReservedIndexGroups = TcAdsWebService.TcAdsReservedIndexGroups;
import InternalError = TcAdsWebService.InternalError;

type ADSDatatype = 'int' | 'byte' | 'sint' | 'dint' | 'word' | 'dword' | 'bool' | 'real' | 'lreal';

interface ADSBaseMetric {
    name: string;
    metricType: 'gauge' | 'counter' | 'histogram' | 'summary';
    help: string;
    datatype: ADSDatatype;
}

interface ADSSingleMetric extends ADSBaseMetric {
    symbol: string;
}

interface ADSMultipleMetric extends ADSBaseMetric {
    multiple: {
        symbol: string,
        label: string
    }[]
}

interface Target {
    netId: string;
    port: number;
    label?: string;
    metrics: ADSBaseMetric[];
}

export interface WebserviceConfig {
    password?: string;
    username?: string;
    url: string;
    targets: Target[];
}

export interface ResultValue {
    metric: ADSBaseMetric,
    label?: string[];
    value: number;
}

interface RequestSymbols {
    [symbol: string]: ADSDatatype;
}

interface SymbolHandlesNetId {
    [netId: string]: SymbolHandlesPort;
}

interface SymbolHandlesPort {
    [port: number]: SymbolHandles;
}

interface SymbolHandles {
    [symbol: string]: number;
}

interface SymbolValues {
    [symbol: string]: boolean | number;
}

interface SymbolMetrics {
    [symbol: string]: ADSBaseMetric;
}

interface SymbolLabels {
    [symbol: string]: string[];
}

export class TcAdsWebserviceBackend {
    config: WebserviceConfig;
    client: TcAdsWebService.Client;
    symbolHandles: SymbolHandlesNetId = {};

    private readTimeout: 10000;

    constructor() {
        const configFile = path.join(__dirname, '../config/webservice.yaml');
        console.log('loading config from ', configFile);
        this.config = Yaml.load(configFile);
        console.log('config loaded with ', this.config.targets.length, ' targets');

        this.client = new TcAdsWebService.Client(
            this.config.url,
            this.config.username,
            this.config.password);
    }

    getSymbolValues(sNetId: string, nPort: number, aSymbols: RequestSymbols): Observable<SymbolValues> {
        return this.getSymbolHandles(sNetId, nPort, aSymbols)
            .pipe(
                flatMap(
                    (symbolHandles: SymbolHandles) => {
                        const readSymbolValuesWriter = new TcAdsWebService.DataWriter();
                        let requestSize = 0;
                        Object.entries(symbolHandles).forEach(
                            ([symbol, handle]) => {
                                readSymbolValuesWriter.writeDINT(TcAdsWebService.TcAdsReservedIndexGroups.SymbolValueByHandle);
                                readSymbolValuesWriter.writeDINT(handle); // IndexOffset = The target handle
                                readSymbolValuesWriter.writeDINT(TcAdsWebserviceBackend.getSizeOfType(aSymbols[symbol])); // Size to read;
                                requestSize += TcAdsWebserviceBackend.getSizeOfType(aSymbols[symbol]);
                            }
                        );
                        const readSymbolValuesData = readSymbolValuesWriter.getBase64EncodedData();

                        return new Observable<SymbolValues>(
                            subscriber => {
                                this.client.readwrite(
                                    sNetId,
                                    nPort,
                                    TcAdsReservedIndexGroups.SymbolValuesByHandleList, // 0xF080 = Read command;
                                    Object.entries(symbolHandles).length, // IndexOffset = Variables count;
                                    requestSize + (Object.entries(symbolHandles).length * 4), // Length of requested data + 4 byte errorcode per variable;
                                    readSymbolValuesData,
                                    (resp) => {
                                        if (resp.hasError) {
                                            subscriber.error(resp.error)
                                        }

                                        const reader = resp.reader;
                                        // Read error code and each symbol;
                                        Object.entries(aSymbols).forEach(
                                            symbol => {
                                                const err = reader.readDWORD();

                                                if (err !== 0) {
                                                    subscriber.error(`Error Code ${err} while retrieving handle for ${symbol}`);
                                                }
                                            }
                                        );

                                        const symbolValues: SymbolValues = {};
                                        Object.entries(aSymbols).forEach(
                                            ([symbol, type]) => {
                                                symbolValues[symbol] = TcAdsWebserviceBackend.readValue(reader, type)
                                            }
                                        );

                                        subscriber.next(symbolValues);
                                        subscriber.complete()
                                    },
                                    null,
                                    this.readTimeout,
                                    error => subscriber.error(error));
                            }
                        );
                    }
                )
            )
    }

    getSymbolHandles(sNetId: string, nPort: number, aSymbols: RequestSymbols): Observable<SymbolHandles> {
        return new Observable(
            subscriber => {
                if (!this.symbolHandles[sNetId]) {
                    this.symbolHandles[sNetId] = {};
                }

                if (!this.symbolHandles[sNetId][nPort]) {
                    this.symbolHandles[sNetId][nPort] = {};
                }

                const unknownSymbols: string[] = [];
                Object.entries(aSymbols).forEach(
                    ([symbol]) => {
                        if (!this.symbolHandles[sNetId][nPort][symbol]) {
                            unknownSymbols.push(symbol);
                        }
                    }
                );

                if (Object.entries(aSymbols).length > 0) {
                    const handleswriter = new TcAdsWebService.DataWriter();

                    unknownSymbols.forEach(
                        symbol => {
                            handleswriter.writeDINT(TcAdsWebService.TcAdsReservedIndexGroups.SymbolHandleByName);
                            handleswriter.writeDINT(0);
                            handleswriter.writeDINT(4); // Expected size; A handle has a size of 4 byte;
                            handleswriter.writeDINT(symbol.length); // The length of the symbol name string;
                        });

                    unknownSymbols.forEach(
                        symbol => {
                            handleswriter.writeString(symbol, symbol.length);
                        });

                    this.client.readwrite(
                        sNetId,
                        nPort,
                        TcAdsReservedIndexGroups.SymbolHandlesByNameList,
                        unknownSymbols.length, // IndexOffset = Count of requested symbol handles;
                        (unknownSymbols.length * 4) + (unknownSymbols.length * 8), // Length of requested data + 4 byte errorcode and 4 byte length per twincat symbol;
                        handleswriter.getBase64EncodedData(),
                        (resp) => {
                            if (resp.hasError) {
                                subscriber.error(resp.error)
                            }

                            const reader = resp.reader;
                            // Read error code and length for each handle;
                            unknownSymbols.forEach(
                                symbol => {
                                    const err = reader.readDWORD();
                                    reader.readDWORD(); // read len and discard

                                    if (err !== 0) {
                                        subscriber.error(`Error Code ${err} while retrieving handle for ${symbol}`);
                                    }
                                }
                            );

                            unknownSymbols.forEach(
                                symbol => {
                                    this.symbolHandles[sNetId][nPort][symbol] = reader.readDWORD();
                                }
                            );

                            const resultHandles: SymbolHandles = {};
                            Object.entries(aSymbols).forEach(
                                ([symbol]) => {
                                    resultHandles[symbol] = this.symbolHandles[sNetId][nPort][symbol]
                                }
                            );

                            subscriber.next(resultHandles);
                            subscriber.complete();
                        },
                        null,
                        this.readTimeout,
                        error => subscriber.error(error));
                }
            }
        );
    }

    getValues() {
        const observables: any[] = [];
        this.config.targets.forEach(
            target => observables.push(this.handleTarget(target))
        );
        return merge(...observables)
            .pipe(
                groupBy((value: ResultValue) => value.metric.name),
                mergeMap(group => group.pipe(toArray())),
                toArray()
            );
    }

    private static getSizeOfType(type: ADSDatatype) {
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

    private static readValue(reader: TcAdsWebService.DataReader, type: ADSDatatype) {
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

    private handleTarget(target: Target): Observable<ResultValue> {
        const requestSymbols: RequestSymbols = {};
        const symbolMetrics: SymbolMetrics = {};
        const symbolLabels: SymbolLabels = {};

        target.metrics.forEach(
            (metric) => {
                if (hasOwnProperty(metric, 'symbol')) {
                    requestSymbols[(metric as ADSSingleMetric).symbol] = metric.datatype;
                    symbolMetrics[(metric as ADSSingleMetric).symbol] = metric;
                    symbolLabels[(metric as ADSSingleMetric).symbol] = [];
                    if (target.label) {
                        symbolLabels[(metric as ADSSingleMetric).symbol].push(target.label)
                    }
                } else if (hasOwnProperty(metric, 'multiple')) {
                    (metric as ADSMultipleMetric).multiple.forEach(
                        mmetric => {
                            requestSymbols[mmetric.symbol] = metric.datatype;
                            symbolMetrics[mmetric.symbol] = metric;
                            symbolLabels[mmetric.symbol] = [];
                            if (mmetric.label) {
                                symbolLabels[mmetric.symbol].push(mmetric.label)
                            }
                            if (target.label) {
                                symbolLabels[mmetric.symbol].push(target.label)
                            }
                        }
                    );
                }
            }
        );

        return this.getSymbolValues(target.netId, target.port, requestSymbols)
            .pipe(
                flatMap(
                    obj => {
                        const result: any[] = [];
                        Object.entries(obj).forEach(
                            ([symbol, value]) => result.push({
                                metric: symbolMetrics[symbol],
                                label: symbolLabels[symbol],
                                value
                            })
                        );
                        return result;
                    }
                ),
                catchError((error) => {
                    if (error instanceof InternalError) {
                        console.error('InternalError', target.netId, target.port, error.errorMessage, error.errorCode);
                    } else {
                        console.error('Generic Error: ', JSON.stringify(error));
                    }
                    return EMPTY;
                })
            );
    }
}
