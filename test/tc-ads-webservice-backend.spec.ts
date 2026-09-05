import {TcAdsWebserviceBackend, WebserviceConfig} from '../src/tc-ads-webservice-backend';
import {TcAdsWebService} from '../src/tc-ads-webservice';

import DataWriter = TcAdsWebService.DataWriter;
import DataReader = TcAdsWebService.DataReader;

const config = (): WebserviceConfig => ({
    url: 'http://localhost/TcAdsWebService.dll',
    targets: [
        {
            netId: '1.2.3.4.1.1',
            port: 801,
            label: 'plc="a"',
            metrics: [
                {
                    name: 'single_metric',
                    metricType: 'gauge',
                    help: 'a single symbol',
                    datatype: 'int',
                    symbol: 'MAIN.single'
                },
                {
                    name: 'multi_metric',
                    metricType: 'gauge',
                    help: 'several symbols under one name',
                    datatype: 'int',
                    multiple: [
                        {symbol: 'MAIN.a[1]', label: 'tank="1"'},
                        {symbol: 'MAIN.a[2]', label: 'tank="2"'}
                    ]
                }
            ] as any
        }
    ]
});

/**
 * Stands in for the SOAP client. Replies to the handle request with sequential
 * handles and to the value request with the supplied values, in symbol order.
 */
const stubClient = (values: number[], opts: { failWith?: any } = {}) => {
    const symbolCount = values.length;

    return {
        calls: [] as any[][],
        readwrite(...args: any[]) {
            this.calls.push(args);
            const [, , indexGroup, , , , callback, , , errorCallback] = args;

            if (opts.failWith) {
                errorCallback(opts.failWith);
                return;
            }

            const writer = new DataWriter();
            if (indexGroup === TcAdsWebService.TcAdsReservedIndexGroups.SymbolHandlesByNameList) {
                for (let i = 0; i < symbolCount; i++) {
                    writer.writeDWORD(0);      // error code
                    writer.writeDWORD(4);      // length
                }
                for (let i = 0; i < symbolCount; i++) {
                    writer.writeDWORD(100 + i); // the handle
                }
            } else {
                for (let i = 0; i < symbolCount; i++) {
                    writer.writeDWORD(0);      // per-symbol error code
                }
                values.forEach(v => writer.writeINT(v));
            }

            callback(new TcAdsWebService.Response(false, undefined, new DataReader(writer.getBase64EncodedData())));
        }
    };
};

describe('TcAdsWebserviceBackend construction', () => {
    it('accepts an in-memory config and builds a client for its url', () => {
        const backend = new TcAdsWebserviceBackend(config());
        expect(backend.config.targets).toHaveLength(1);
        expect(backend.client).toBeInstanceOf(TcAdsWebService.Client);
    });
});

describe('ADS type sizes', () => {
    it.each([
        ['sint', 1], ['byte', 1], ['bool', 1],
        ['int', 2], ['word', 2],
        ['dint', 4], ['dword', 4], ['real', 4],
        ['lreal', 8]
    ])('reports %s as %i byte(s)', (type, size) => {
        expect((TcAdsWebserviceBackend as any).getSizeOfType(type)).toBe(size);
    });

    it('falls back to a single byte for an unknown type', () => {
        expect((TcAdsWebserviceBackend as any).getSizeOfType('nonsense')).toBe(1);
    });
});

describe('reading a value by declared type', () => {
    it.each([
        ['int', (w: any) => w.writeINT(-5), -5],
        ['byte', (w: any) => w.writeBYTE(250), 250],
        ['sint', (w: any) => w.writeSINT(-3), -3],
        ['dint', (w: any) => w.writeDINT(-70000), -70000],
        ['word', (w: any) => w.writeWORD(65535), 65535],
        ['dword', (w: any) => w.writeDWORD(4294967295), 4294967295],
        ['bool', (w: any) => w.writeBOOL(true), true]
    ])('dispatches %s to the matching reader', (type, write, expected) => {
        const writer = new DataWriter();
        (write as any)(writer);
        const reader = new DataReader(writer.getBase64EncodedData());
        expect((TcAdsWebserviceBackend as any).readValue(reader, type)).toBe(expected);
    });
});

describe('getValues', () => {
    it('emits one group per metric name, with labels attached', done => {
        const backend = new TcAdsWebserviceBackend(config());
        backend.client = stubClient([11, 22, 33]) as any;

        backend.getValues().subscribe({
            next: (groups: any[]) => {
                const byName: Record<string, any[]> = {};
                groups.forEach(group => byName[group[0].metric.name] = group);

                expect(Object.keys(byName).sort()).toEqual(['multi_metric', 'single_metric']);
                expect(byName.single_metric).toHaveLength(1);
                expect(byName.multi_metric).toHaveLength(2);

                // a single-symbol metric carries only the target label
                expect(byName.single_metric[0].label).toEqual(['plc="a"']);
                expect(byName.single_metric[0].value).toBe(11);

                // a multi-symbol metric carries its own label first, then the target label
                expect(byName.multi_metric[0].label).toEqual(['tank="1"', 'plc="a"']);
                expect(byName.multi_metric[1].label).toEqual(['tank="2"', 'plc="a"']);
                expect(byName.multi_metric.map((v: any) => v.value)).toEqual([22, 33]);
                done();
            },
            error: done
        });
    });

    it('requests handles before values, against the configured netId and port', done => {
        const backend = new TcAdsWebserviceBackend(config());
        const client = stubClient([1, 2, 3]);
        backend.client = client as any;

        backend.getValues().subscribe({
            next: () => {
                expect(client.calls).toHaveLength(2);
                expect(client.calls[0][2]).toBe(TcAdsWebService.TcAdsReservedIndexGroups.SymbolHandlesByNameList);
                expect(client.calls[1][2]).toBe(TcAdsWebService.TcAdsReservedIndexGroups.SymbolValuesByHandleList);
                client.calls.forEach(args => {
                    expect(args[0]).toBe('1.2.3.4.1.1');
                    expect(args[1]).toBe(801);
                });
                done();
            },
            error: done
        });
    });

    it('caches symbol handles, so a second read asks for no further handles', done => {
        const backend = new TcAdsWebserviceBackend(config());
        const client = stubClient([1, 2, 3]);
        backend.client = client as any;

        backend.getValues().subscribe({
            next: () => {
                expect(backend.symbolHandles['1.2.3.4.1.1'][801]).toEqual({
                    'MAIN.single': 100,
                    'MAIN.a[1]': 101,
                    'MAIN.a[2]': 102
                });

                backend.getValues().subscribe({
                    next: () => {
                        const handleLookups = client.calls
                            .filter(args => args[2] === TcAdsWebService.TcAdsReservedIndexGroups.SymbolHandlesByNameList);

                        // the request is still issued, but it asks for zero symbols
                        // (indexOffset and payload are both empty) because all three are cached
                        expect(handleLookups).toHaveLength(2);
                        expect(handleLookups[0][3]).toBe(3);
                        expect(handleLookups[1][3]).toBe(0);
                        expect(handleLookups[1][5]).toBe('');
                        done();
                    },
                    error: done
                });
            },
            error: done
        });
    });

    it('swallows a target failure and completes with no groups', done => {
        const backend = new TcAdsWebserviceBackend(config());
        backend.client = stubClient([1], {failWith: new TcAdsWebService.InternalError('boom', 1808)}) as any;
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        backend.getValues().subscribe({
            next: (groups: any[]) => {
                expect(groups).toEqual([]);
                done();
            },
            error: done
        });
    });
});
