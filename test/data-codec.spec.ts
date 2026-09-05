import {TcAdsWebService} from '../src/tc-ads-webservice';

import DataWriter = TcAdsWebService.DataWriter;
import DataReader = TcAdsWebService.DataReader;

/**
 * The DataWriter/DataReader pair is the ADS wire codec: it turns numbers into the
 * little-endian base64 payload the TwinCAT web service expects, and back again.
 * These are pure functions with no I/O, so they pin the exact byte layout.
 */
describe('DataWriter', () => {
    it('encodes a DINT little-endian', () => {
        const writer = new DataWriter();
        writer.writeDINT(1);
        // 01 00 00 00
        expect(writer.getBase64EncodedData()).toBe('AQAAAA==');
    });

    it('encodes a WORD little-endian', () => {
        const writer = new DataWriter();
        writer.writeWORD(258); // 0x0102 -> 02 01
        expect(writer.getBase64EncodedData()).toBe('AgE=');
    });

    it('appends successive writes in call order', () => {
        const writer = new DataWriter();
        writer.writeDINT(TcAdsWebService.TcAdsReservedIndexGroups.SymbolValueByHandle);
        writer.writeDINT(7);
        writer.writeDINT(2);
        expect(writer.byteArray).toEqual([
            0x05, 0xF0, 0x00, 0x00, // 61445
            0x07, 0x00, 0x00, 0x00,
            0x02, 0x00, 0x00, 0x00
        ]);
    });

    it('null-pads a string written to a longer length', () => {
        const writer = new DataWriter();
        writer.writeString('AB', 4);
        expect(writer.byteArray).toEqual([65, 66, 0, 0]);
    });
});

describe('DataWriter -> DataReader round trip', () => {
    const roundTrip = (write: (w: TcAdsWebService.DataWriter) => void,
                       read: (r: TcAdsWebService.DataReader) => any) => {
        const writer = new DataWriter();
        write(writer);
        return read(new DataReader(writer.getBase64EncodedData()));
    };

    it.each([
        ['SINT', 1, -12, (w: any, v: any) => w.writeSINT(v), (r: any) => r.readSINT()],
        ['INT', 2, -1234, (w: any, v: any) => w.writeINT(v), (r: any) => r.readINT()],
        ['DINT', 4, -123456, (w: any, v: any) => w.writeDINT(v), (r: any) => r.readDINT()],
        ['BYTE', 1, 200, (w: any, v: any) => w.writeBYTE(v), (r: any) => r.readBYTE()],
        ['WORD', 2, 65000, (w: any, v: any) => w.writeWORD(v), (r: any) => r.readWORD()],
        ['DWORD', 4, 4000000000, (w: any, v: any) => w.writeDWORD(v), (r: any) => r.readDWORD()]
    ])('preserves a %s', (_name, _size, value, write, read) => {
        expect(roundTrip(w => (write as any)(w, value), read as any)).toBe(value);
    });

    it('preserves a REAL to float32 precision', () => {
        const result = roundTrip(w => w.writeREAL(3.5), r => r.readREAL());
        expect(result).toBeCloseTo(3.5, 5);
    });

    it('preserves a LREAL to float64 precision', () => {
        const result = roundTrip(w => w.writeLREA(1234.5678), r => r.readLREAL());
        expect(result).toBeCloseTo(1234.5678, 5);
    });

    it('reads BOOL back as a real boolean', () => {
        expect(roundTrip(w => w.writeBOOL(true), r => r.readBOOL())).toBe(true);
        expect(roundTrip(w => w.writeBOOL(false), r => r.readBOOL())).toBe(false);
    });

    it('preserves a fixed-length string', () => {
        expect(roundTrip(w => w.writeString('MAIN.foo', 8), r => r.readString(8))).toBe('MAIN.foo');
    });

    it('advances the offset so mixed types read back in order', () => {
        const writer = new DataWriter();
        writer.writeDWORD(0);        // error code
        writer.writeDWORD(4);        // length
        writer.writeINT(4242);       // payload
        const reader = new DataReader(writer.getBase64EncodedData());
        expect(reader.readDWORD()).toBe(0);
        expect(reader.readDWORD()).toBe(4);
        expect(reader.readINT()).toBe(4242);
    });

    it('rejects a non-numeric string length', () => {
        const reader = new DataReader(new DataWriter().getBase64EncodedData());
        expect(() => reader.readString(NaN)).toThrow('Parameter "length" has to be a valid number.');
    });
});
