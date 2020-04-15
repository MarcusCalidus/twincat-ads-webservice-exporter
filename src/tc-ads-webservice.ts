/*
------------------------------------------
TcAdsWebService Typescript Library for NodeJs
------------------------------------------
Version: v1.0.5.0
------------------------------------------
Original Javascript Library Copyright 2012, Beckhoff Automation GmbH
http://www.beckhoff.com
Translation to Typescript by Marco Warm
https://github.com/MarcusCalidus
------------------------------------------
*/

import axios, {AxiosBasicCredentials, AxiosError, AxiosResponse} from 'axios';
import {DOMParser} from 'xmldom';

export namespace TcAdsWebService {
    type PCallback = (resp: Response, userState: any) => void

    type ErrorCallback = (error: AxiosError) => void

    export class Response {
        public hasError: boolean;
        public error: any;
        public reader: TcAdsWebService.DataReader;

        constructor(hasError: boolean, error: any, reader: TcAdsWebService.DataReader) {
            this.hasError = hasError;
            this.error = error;
            this.reader = reader;
        }
    }

    export class InternalError {
        private errorMessage: string;
        private errorCode: number;

        constructor(errorMessage: string, errorCode: number) {
            this.errorMessage = errorMessage;
            this.errorCode = errorCode;
        }
    }

    export class ResquestError {
        private requestStatus: number;
        private requestStatusText: string;

        constructor(requestStatus: number, requestStatusText: string) {
            this.requestStatus = requestStatus;
            this.requestStatusText = requestStatusText;
        }
    }

    export class Client {
        private sServiceUrl: string;
        private sServiceUser: string;
        private sServicePassword: string;

        constructor(sServiceUrl: string, sServiceUser: string, sServicePassword: string) {
            this.sServiceUrl = sServiceUrl;
            this.sServiceUser = sServiceUser;
            this.sServicePassword = sServicePassword;
        }

        readwrite(sNetId: string,
                  nPort: number,
                  nIndexGroup: number,
                  nIndexOffset: number,
                  cbRdLen: number,
                  pwrData: string,
                  pCallback: PCallback,
                  userState: any,
                  ajaxTimeout: number,
                  errorCallback: ErrorCallback) {
            const message =
                '<?xml version="1.0" encoding="utf-8"?>' +
                '<SOAP-ENV:Envelope ' +
                'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance/" ' +
                'xmlns:xsd="http://www.w3.org/2001/XMLSchema/" ' +
                'xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
                'SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" >' +
                '<SOAP-ENV:Body><q1:ReadWrite xmlns:q1="http://beckhoff.org/message/">' +
                '<netId xsi:type="xsd:string">' + sNetId + '</netId>' +
                '<nPort xsi:type="xsd:int">' + nPort + '</nPort>' +
                '<indexGroup xsi:type="xsd:unsignedInt">' + nIndexGroup + '</indexGroup>' +
                '<indexOffset xsi:type="xsd:unsignedInt">' + nIndexOffset + '</indexOffset>' +
                '<cbRdLen xsi:type="xsd:int">' + cbRdLen + '</cbRdLen>' +
                '<pwrData xsi:type="xsd:base64Binary">' + pwrData + '</pwrData>' +
                '</q1:ReadWrite></SOAP-ENV:Body></SOAP-ENV:Envelope>';

            return this.sendMessage(message, 'http://beckhoff.org/action/TcAdsSync.Readwrite', pCallback, userState, ajaxTimeout, errorCallback);

        }

        readState(sNetId: string, nPort: number, pCallback: PCallback, userState: any, ajaxTimeout: number, errorCallback: ErrorCallback) {

            const message =
                '<?xml version="1.0" encoding="utf-8"?>' +
                '<SOAP-ENV:Envelope ' +
                'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance/" ' +
                'xmlns:xsd="http://www.w3.org/2001/XMLSchema/" ' +
                'xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
                'SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" >' +
                '<SOAP-ENV:Body><q1:ReadState xmlns:q1="http://beckhoff.org/message/">' +
                '<netId xsi:type="xsd:string">' + sNetId + '</netId>' +
                '<nPort xsi:type="xsd:int">' + nPort + '</nPort>' +
                '</q1:ReadState></SOAP-ENV:Body></SOAP-ENV:Envelope>';

            return this.sendMessage(message, 'http://beckhoff.org/action/TcAdsSync.ReadState', pCallback, userState, ajaxTimeout, errorCallback);
        }

        writeControl(sNetId: string, nPort: number, adsState: number, deviceState: number, pData: string, pCallback: PCallback, userState: any, ajaxTimeout: number, errorCallback: ErrorCallback) {

            const message =
                '<?xml version="1.0" encoding="utf-8"?>' +
                '<SOAP-ENV:Envelope ' +
                'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance/" ' +
                'xmlns:xsd="http://www.w3.org/2001/XMLSchema/" ' +
                'xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
                'SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" >' +
                '<SOAP-ENV:Body><q1:WriteControl xmlns:q1="http://beckhoff.org/message/">' +
                '<netId xsi:type="xsd:string">' + sNetId + '</netId>' +
                '<nPort xsi:type="xsd:int">' + nPort + '</nPort>' +
                '<adsState xsi:type="xsd:int">' + adsState + '</adsState>' +
                '<deviceState xsi:type="xsd:int">' + deviceState + '</deviceState>' +
                '<pData xsi:type="xsd:base64Binary">' + pData + '</pData>' +
                '</q1:WriteControl></SOAP-ENV:Body></SOAP-ENV:Envelope>';

            return this.sendMessage(message, 'http://beckhoff.org/action/TcAdsSync.WriteControl', pCallback, userState, ajaxTimeout, errorCallback);
        }

        write(sNetId: string,
              nPort: number,
              nIndexGroup: number,
              nIndexOffset: number,
              pData: string,
              pCallback: PCallback,
              userState: any,
              ajaxTimeout: number,
              errorCallback: ErrorCallback) {

            const message =
                '<?xml version="1.0" encoding="utf-8"?>' +
                '<SOAP-ENV:Envelope ' +
                'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance/" ' +
                'xmlns:xsd="http://www.w3.org/2001/XMLSchema/" ' +
                'xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
                'SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" >' +
                '<SOAP-ENV:Body><q1:Write xmlns:q1="http://beckhoff.org/message/">' +
                '<netId xsi:type="xsd:string">' + sNetId + '</netId>' +
                '<nPort xsi:type="xsd:int">' + nPort + '</nPort>' +
                '<indexGroup xsi:type="xsd:unsignedInt">' + nIndexGroup + '</indexGroup>' +
                '<indexOffset xsi:type="xsd:unsignedInt">' + nIndexOffset + '</indexOffset>' +
                '<pData xsi:type="xsd:base64Binary">' + pData + '</pData>' +
                '</q1:Write></SOAP-ENV:Body></SOAP-ENV:Envelope>';

            return this.sendMessage(message, 'http://beckhoff.org/action/TcAdsSync.Write', pCallback, userState, ajaxTimeout, errorCallback);
        }

        read(sNetId: string,
             nPort: number,
             nIndexGroup: number,
             nIndexOffset: number,
             cbLen: number,
             pCallback: PCallback,
             userState: any,
             ajaxTimeout: number,
             errorCallback: ErrorCallback) {

            const message =
                '<?xml version="1.0" encoding="utf-8"?>' +
                '<SOAP-ENV:Envelope ' +
                'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance/" ' +
                'xmlns:xsd="http://www.w3.org/2001/XMLSchema/" ' +
                'xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
                'SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" >' +
                '<SOAP-ENV:Body><q1:Read xmlns:q1="http://beckhoff.org/message/">' +
                '<netId xsi:type="xsd:string">' + sNetId + '</netId>' +
                '<nPort xsi:type="xsd:int">' + nPort + '</nPort>' +
                '<indexGroup xsi:type="xsd:unsignedInt">' + nIndexGroup + '</indexGroup>' +
                '<indexOffset xsi:type="xsd:unsignedInt">' + nIndexOffset + '</indexOffset>' +
                '<cbLen xsi:type="xsd:int">' + cbLen + '</cbLen>' +
                '</q1:Read></SOAP-ENV:Body></SOAP-ENV:Envelope>';

            return this.sendMessage(message, 'http://beckhoff.org/action/TcAdsSync.Read', pCallback, userState, ajaxTimeout, errorCallback);
        }

        handleResponse(response: AxiosResponse) {
            let errorMessage: any;
            let errorCode: any = 0;

            if (response.status !== 200) {
                // Request has been aborted.
                //  Maybe because of timeout.
                let resp;
                try {
                    resp = new TcAdsWebService.Response(
                        true, new TcAdsWebService.ResquestError(response.status, response.statusText), undefined);
                } catch (err) {
                    // Internet Explorer throws exception on abort
                    resp = new TcAdsWebService.Response(
                        true, new TcAdsWebService.ResquestError(0, '0'), undefined);
                }

                response = null;
                return resp;
            }

            const sSoapResponse = new DOMParser().parseFromString(response.data, response.headers['content-type'] || 'text/xml');
            const faultstringNodes = sSoapResponse.getElementsByTagName('faultstring');

            if (faultstringNodes.length !== 0) {

                errorMessage = faultstringNodes[0].firstChild.nodeValue;
                const errorCodeNodes = sSoapResponse.getElementsByTagName('errorcode');

                if (errorCodeNodes.length !== 0) {
                    errorCode = sSoapResponse.getElementsByTagName('errorcode')[0].firstChild.nodeValue;
                } else {
                    errorCode = '-';
                }

                const resp = new TcAdsWebService.Response(
                    true, new TcAdsWebService.InternalError(errorMessage, errorCode), undefined);

                response = null;
                return resp;

            } else {

                const ppDataNodes = sSoapResponse.getElementsByTagName('ppData');
                const ppRdDataNodes = sSoapResponse.getElementsByTagName('ppRdData');
                const pAdsStateNodes = sSoapResponse.getElementsByTagName('pAdsState');
                const pDeviceStateNodes = sSoapResponse.getElementsByTagName('pDeviceState');

                let soapData = '';
                if (ppDataNodes.length !== 0) {
                    // read
                    // tslint:disable
                    // childNodes are not iterable via foreach
                    for (let i = 0; i < ppDataNodes[0].childNodes.length; i++) {
                        soapData += ppDataNodes[0].childNodes[i].nodeValue;
                    }
                    // tslint:enable
                } else if (ppRdDataNodes.length !== 0) {
                    // readwrite
                    // tslint:disable
                    // childNodes are not iterable via foreach
                    for (let i = 0; i < ppRdDataNodes[0].childNodes.length; i++) {
                        soapData += ppRdDataNodes[0].childNodes[i].nodeValue;
                    }
                    // tslint:enable
                } else if (pAdsStateNodes.length !== 0 && pDeviceStateNodes.length) {
                    // readState
                    const adsState = pAdsStateNodes[0].firstChild.nodeValue;
                    const deviceState = pDeviceStateNodes[0].firstChild.nodeValue;

                    const writer = new DataWriter();
                    writer.writeWORD(parseInt(adsState, 10));
                    writer.writeWORD(parseInt(deviceState, 10));

                    soapData = writer.getBase64EncodedData();
                }

                if (soapData) {
                    const resp = new TcAdsWebService.Response(
                        false,
                        undefined,
                        new TcAdsWebService.DataReader(soapData));
                    response = null;
                    return resp;
                } else {
                    // write completes without data in response
                    const resp = new TcAdsWebService.Response(false, undefined, undefined);
                    response = null;
                    return resp;
                }
            }
        }

        getAxiosCredentials(): AxiosBasicCredentials {
            if (!this.sServiceUser) {
                return null;
            }

            return {
                username: this.sServiceUser,
                password: this.sServicePassword
            }
        }

        sendMessage(message: string, method: string, pCallback: PCallback, userState: any, ajaxTimeout: number, errorCallback: ErrorCallback) {
            axios.post(this.sServiceUrl, message, {
                    headers: {
                        'Content-Type': 'text/xml'
                    },
                    auth: this.getAxiosCredentials(),
                    timeout: ajaxTimeout
                })
                .then(
                    (response: AxiosResponse) => {
                        pCallback(
                            this.handleResponse(response),
                            userState)
                    }
                )
                .catch(
                    (err: AxiosError) => {
                        if (errorCallback) {
                            errorCallback(err);
                        }
                    }
                )
        }
    }

    export class DataReader {
        private offset: number;
        private decodedData: string;

        constructor(data: any) {
            this.offset = 0;
            this.decodedData = Base64.decode(data);
        }

        readSINT() {
            const res = convertDataToInt(this.decodedData.substr(this.offset, 1), 1);
            this.offset = this.offset + 1;
            return res;
        }

        readINT() {
            const res = convertDataToInt(this.decodedData.substr(this.offset, 2), 2);
            this.offset = this.offset + 2;
            return res;
        }

        readDINT() {
            const res = convertDataToInt(this.decodedData.substr(this.offset, 4), 4);
            this.offset = this.offset + 4;
            return res;
        }

        readBYTE() {
            const res = convertDataToUInt(this.decodedData.substr(this.offset, 1), 1);
            this.offset = this.offset + 1;
            return res;
        }

        readWORD() {
            const res = convertDataToUInt(this.decodedData.substr(this.offset, 2), 2);
            this.offset = this.offset + 2;
            return res;
        }

        readDWORD() {
            const res = convertDataToUInt(this.decodedData.substr(this.offset, 4), 4);
            this.offset = this.offset + 4;
            return res;
        }

        readBOOL() {
            const res = this.decodedData.substr(this.offset, 1).charCodeAt(0);
            this.offset = this.offset + 1;
            if (res === 0)
                return false;
            if (res === 1)
                return true;
            return res;
        }

        readString(length: number) {

            if (isNaN(length)) {
                throw new Error('Parameter "length" has to be a valid number.');
            }

            const res = this.decodedData.substr(this.offset, length);
            this.offset = this.offset + length;
            return res;
        }

        readREAL() {
            const decData = [];
            decData[0] = convertDataToUInt(this.decodedData.substr(this.offset, 1), 1);
            decData[1] = convertDataToUInt(this.decodedData.substr(this.offset + 1, 1), 1);
            decData[2] = convertDataToUInt(this.decodedData.substr(this.offset + 2, 1), 1);
            decData[3] = convertDataToUInt(this.decodedData.substr(this.offset + 3, 1), 1);

            const binData = [];
            binData[0] = dec2Binary(decData[0]);
            binData[1] = dec2Binary(decData[1]);
            binData[2] = dec2Binary(decData[2]);
            binData[3] = dec2Binary(decData[3]);

            const binStr = binData[3] + binData[2] + binData[1] + binData[0];

            const res = binary2Real(binStr, TcAdsWebServiceDataTypes.REAL);
            this.offset = this.offset + 4;
            return res;
        }

        readLREAL() {
            const decData = [];
            decData[0] = convertDataToUInt(this.decodedData.substr(this.offset, 1), 1);
            decData[1] = convertDataToUInt(this.decodedData.substr(this.offset + 1, 1), 1);
            decData[2] = convertDataToUInt(this.decodedData.substr(this.offset + 2, 1), 1);
            decData[3] = convertDataToUInt(this.decodedData.substr(this.offset + 3, 1), 1);
            decData[4] = convertDataToUInt(this.decodedData.substr(this.offset + 4, 1), 1);
            decData[5] = convertDataToUInt(this.decodedData.substr(this.offset + 5, 1), 1);
            decData[6] = convertDataToUInt(this.decodedData.substr(this.offset + 6, 1), 1);
            decData[7] = convertDataToUInt(this.decodedData.substr(this.offset + 7, 1), 1);

            const binData = [];
            binData[0] = dec2Binary(decData[0]);
            binData[1] = dec2Binary(decData[1]);
            binData[2] = dec2Binary(decData[2]);
            binData[3] = dec2Binary(decData[3]);
            binData[4] = dec2Binary(decData[4]);
            binData[5] = dec2Binary(decData[5]);
            binData[6] = dec2Binary(decData[6]);
            binData[7] = dec2Binary(decData[7]);

            const binStr = binData[7] + binData[6] + binData[5] + binData[4] + binData[3] + binData[2] + binData[1] + binData[0];

            const res = binary2Real(binStr, TcAdsWebServiceDataTypes.LREAL);
            this.offset = this.offset + 8;
            return res;
        }
    }


    export class DataWriter {
        getBase64EncodedData () {
            return Base64.encode(byteArrayToBinaryString(this.byteArray));
        }

        byteArray: any[] = [];

        writeSINT(value: number) {
            this.byteArray = this.PrepareData(value, TcAdsWebServiceDataTypes.Integer, 1, this.byteArray);
        }

        writeINT(value: number) {
            this.byteArray = this.PrepareData(value, TcAdsWebServiceDataTypes.Integer, 2, this.byteArray);
        }

        writeDINT(value: number) {
            this.byteArray = this.PrepareData(value, TcAdsWebServiceDataTypes.Integer, 4, this.byteArray);
        }

        writeBYTE(value: number) {
            this.byteArray = this.PrepareData(value, TcAdsWebServiceDataTypes.UnsignedInteger, 1, this.byteArray);
        }

        writeWORD(value: number) {
            this.byteArray = this.PrepareData(value, TcAdsWebServiceDataTypes.UnsignedInteger, 2, this.byteArray);
        }

        writeDWORD(value: number) {
            this.byteArray = this.PrepareData(value, TcAdsWebServiceDataTypes.UnsignedInteger, 4, this.byteArray);
        }

        writeBOOL(value: boolean) {
            this.byteArray = this.PrepareData(value, TcAdsWebServiceDataTypes.BOOL, 1, this.byteArray);
        }

        writeString(value: string, length: number) {
            this.byteArray = this.PrepareData(value, TcAdsWebServiceDataTypes.String, length, this.byteArray);
        }

        writeREAL(value: number) {
            this.byteArray = this.PrepareData(value, TcAdsWebServiceDataTypes.REAL, 4, this.byteArray);
        }

        writeLREA(value: number) {
            this.byteArray = this.PrepareData(value, TcAdsWebServiceDataTypes.LREAL, 8, this.byteArray);
        }

        PrepareData(data: any, type: number, len: number, array: any[]) {
            let j = array.length;

            if (type === TcAdsWebServiceDataTypes.String) {
                let k;

                for (k = 0; k < data.length; k++) {
                    array[j++] = data.charCodeAt(k);
                }

                for (; k < len; k++) {
                    array[j++] = 0;
                }

            } else if (type === TcAdsWebServiceDataTypes.BOOL) {
                array[j++] = data;
            } else if (type === TcAdsWebServiceDataTypes.Integer || type === TcAdsWebServiceDataTypes.UnsignedInteger) {

                if (len === 1) {
                    array[j++] = ToByte((data >> (0)).toString(10));
                } else if (len === 2) {
                    data = parseInt(data, 10);
                    array[j++] = ToByte((data >> (0)).toString(10));
                    array[j++] = ToByte((data >> (8)).toString(10));
                } else if (len === 4) {
                    data = parseInt(data, 10);

                    if (isNaN(data))
                        data = 0;

                    array[j++] = ToByte((data >> (0)).toString(10));
                    array[j++] = ToByte((data >> (8)).toString(10));
                    array[j++] = ToByte((data >> (16)).toString(10));
                    array[j++] = ToByte((data >> (24)).toString(10));

                }
            } else if (type === TcAdsWebServiceDataTypes.REAL) {
                const binary = real2Binary(data, type);

                const subBytes = [];
                subBytes[0] = binary.substring(0, 8);
                subBytes[1] = binary.substring(8, 16);
                subBytes[2] = binary.substring(16, 24);
                subBytes[3] = binary.substring(24, 32);

                array[j++] = binary2Dec(subBytes[3]);
                array[j++] = binary2Dec(subBytes[2]);
                array[j++] = binary2Dec(subBytes[1]);
                array[j++] = binary2Dec(subBytes[0]);
            } else if (type === TcAdsWebServiceDataTypes.LREAL) {
                const binary = real2Binary(data, type);

                const subBytes = [];
                subBytes[0] = binary.substring(0, 8);
                subBytes[1] = binary.substring(8, 16);
                subBytes[2] = binary.substring(16, 24);
                subBytes[3] = binary.substring(24, 32);

                subBytes[4] = binary.substring(32, 40);
                subBytes[5] = binary.substring(40, 48);
                subBytes[6] = binary.substring(48, 56);
                subBytes[7] = binary.substring(56, 64);

                array[j++] = binary2Dec(subBytes[7]);
                array[j++] = binary2Dec(subBytes[6]);
                array[j++] = binary2Dec(subBytes[5]);
                array[j++] = binary2Dec(subBytes[4]);
                array[j++] = binary2Dec(subBytes[3]);
                array[j++] = binary2Dec(subBytes[2]);
                array[j++] = binary2Dec(subBytes[1]);
                array[j++] = binary2Dec(subBytes[0]);
            }

            return array;
        }
    }

    export const TcAdsReservedIndexGroups = {
        'PlcRWMX': 16416,
        'PlcRWMB': 16416,
        'PlcRWRB': 16432,
        'PlcRWDB': 16448,
        'SymbolTable': 61440,
        'SymbolName': 61441,
        'SymbolValue': 61442,
        'SymbolHandleByName': 61443,
        'SymbolValueByName': 61444,
        'SymbolValueByHandle': 61445,
        'SymbolReleaseHandle': 61446,
        'SymbolInfoByName': 61447,
        'SymbolVersion': 61448,
        'SymbolInfoByNameEx': 61449,
        'SymbolDownload': 61450,
        'SymbolUpload': 61451,
        'SymbolUploadInfo': 61452,
        'SymbolNote': 61456,
        'IOImageRWIB': 61472,
        'IOImageRWIX': 61473,
        'IOImageRWOB': 61488,
        'IOImageRWOX': 61489,
        'IOImageClearI': 61504,
        'IOImageClearO': 61520,
        'DeviceData': 61696,
        'SymbolHandlesByNameList': 0x0000F082,
        'SymbolValuesByHandleList': 0x0000F080
    };

    export const TcAdsWebServiceDataTypes = {
        'String': 0,
        'BOOL': 1,
        'Integer': 2,
        'UnsignedInteger': 3,
        'LREAL': 4,
        'REAL': 5
    };

    export const AdsState = {
        'INVALID': 0,
        'IDLE': 1,
        'RESET': 2,
        'INIT': 3,
        'START': 4,
        'RUN': 5,
        'STOP': 6,
        'SAVECFG': 7,
        'LOADCFG': 8,
        'POWERFAILURE': 9,
        'POWERGOOD': 10,
        'ERROR': 11,
        'SHUTDOWN': 12,
        'SUSPEND': 13,
        'RESUME': 14,
        'CONFIG': 15,
        'RECONFIG': 16
    };

    function byteArrayToBinaryString(arr: any[]) {
        let res = '';
        arr.forEach(
            item => res += String.fromCharCode(item & 0xFF)
        );
        return res;
    }

    class Base64 {
        static tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

        static encode(data: string) {
            let out = '';
            let c1: number;
            let c2: number;
            let c3: number;
            let e1: number;
            let e2: number;
            let e3: number;
            let e4: number;

            for (let i = 0; i < data.length;) {
                c1 = data.charCodeAt(i++);
                c2 = data.charCodeAt(i++);
                c3 = data.charCodeAt(i++);
                e1 = c1 >> 2;
                e2 = ((c1 & 3) << 4) + (c2 >> 4);
                e3 = ((c2 & 15) << 2) + (c3 >> 6);
                e4 = c3 & 63;
                if (isNaN(c2))
                    e3 = e4 = 64;
                else if (isNaN(c3))
                    e4 = 64;
                out += Base64.tab.charAt(e1) + Base64.tab.charAt(e2) + Base64.tab.charAt(e3) + Base64.tab.charAt(e4);
            }
            return out;
        }

        static decode(data: string) {
            let out = '';
            let c1: number;
            let c2: number;
            let c3: number;
            let e1: number;
            let e2: number;
            let e3: number;
            let e4: number;

            for (let i = 0; i < data.length;) {
                e1 = Base64.tab.indexOf(data.charAt(i++));
                e2 = Base64.tab.indexOf(data.charAt(i++));
                e3 = Base64.tab.indexOf(data.charAt(i++));
                e4 = Base64.tab.indexOf(data.charAt(i++));
                c1 = (e1 << 2) + (e2 >> 4);
                c2 = ((e2 & 15) << 4) + (e3 >> 2);
                c3 = ((e3 & 3) << 6) + e4;
                out += String.fromCharCode(c1);
                if (e3 !== 64)
                    out += String.fromCharCode(c2);
                if (e4 !== 64)
                    out += String.fromCharCode(c3);
            }
            return out;
        }
    }

    function real2Binary(value: number, type: number) {
        let exp: number;
        let man: number;
        let bias: number;

        switch (type) {

            case TcAdsWebServiceDataTypes.LREAL:
                exp = 11;
                man = 52;
                bias = 1023;
                break;

            case TcAdsWebServiceDataTypes.REAL:
            default:
                exp = 8;
                man = 23;
                bias = 127;
        }

        const sign = (value >= 0.0) ? 0 : 1;

        let n = 0;
        let power: number;
        let sign2: number;
        if (value > 0 || value < 0) {
            if (value < 2 && value > -2)
                sign2 = -1;
            else sign2 = 1;

            for (power = 0; n < 1 || n > 2; ++power) {
                n = Math.pow(-1, sign) * value / (Math.pow(2, sign2 * power));
            }
            power--;
        } else {
            power = bias;
            sign2 = -1;
        }

        let exponent: string | number = bias + (sign2 * power);
        exponent = exponent.toString(2);

        for (let i = exponent.length; i < exp; i++) {
            exponent = '0' + exponent;
        }

        let n2 = 0;
        let temp = 0;
        let fraction = '';
        n = n - 1;
        for (let i = 1; i < (man + 1); i++) {
            temp = n2 + 1 / Math.pow(2, i);
            if (temp <= n) {
                n2 = temp;
                fraction += '1';
            } else fraction += '0';
        }

        return sign + exponent + fraction;
    }

    function binary2Real(binary: string, type: number) {
        let nullE = true;
        let nullF = true;
        let oneE = true;
        let strE = '';
        let exp: number;
        let man: number;
        let bias: number;

        switch (type) {

            case TcAdsWebServiceDataTypes.LREAL:
                exp = 11;
                man = 52;
                bias = 1023;
                break;

            case TcAdsWebServiceDataTypes.REAL:
            default:
                exp = 8;
                man = 23;
                bias = 127;
        }

        for (let i = 1; i <= exp; i++) {
            strE += binary.charAt(i);

            if (binary.charAt(i) !== '0')
                nullE = false;

            if (binary.charAt(i) !== '1')
                oneE = false;
        }

        let strF = '';

        for (let i = exp + 1; i <= exp + man; i++) {
            strF += binary.charAt(i);

            if (binary.charAt(i) !== '0')
                nullF = false;
        }

        if (nullE && nullF) {
            // return ((!neg) ? "0" : "-0");
            // Return zero for negative and positive zero
            return 0.0;
        }

        if (oneE && nullF)
            return Infinity;

        if (oneE && nullF)
            return NaN;

        const exponent = binary2Dec(strE) - bias;

        let fraction = 0;

        for (let i = 0; i < strF.length; ++i) {
            fraction = fraction + parseInt(strF.charAt(i), 10) * Math.pow(2, -(i + 1));
        }

        fraction = fraction + 1;
        return Math.pow(-1, parseInt(binary.charAt(0), 10)) * fraction * Math.pow(2, exponent);
    }

    function ToByte(v: string) {
        return parseInt(v, 10) & 255;
    }

    function dec2Binary(value: number) {
        let buf = '';
        let quotient = value;
        let i = 0;

        do {
            buf += (Math.floor(quotient % 2) === 1 ? '1' : '0');
            quotient /= 2;
            i++;
        }
        while (i < 8);

        buf = buf.split('').reverse().join('');

        return buf;
    }

    function binary2Dec(binary: string) {
        let ret = 0;

        for (let i = 0; i < binary.length; ++i) {
            if (binary.charAt(i) === '1')
                ret = ret + Math.pow(2, (binary.length - i - 1));
        }

        return ret;
    }

    function convertDataToUInt(data: string, len: number) {
        let res = 0;

        if (len === 4) {
            res = (data.charCodeAt(3) << 24 | data.charCodeAt(2) << 16 | data.charCodeAt(1) << 8 | data.charCodeAt(0)) >>> 0; // ">>> 0" = handle value as unsigned
        } else if (len === 2) {
            res = (data.charCodeAt(1) << 8 | data.charCodeAt(0)) >>> 0; // ">>> 0" = handle value as unsigned
        } else if (len === 1) {
            res = data.charCodeAt(0) >>> 0; // ">>> 0" = handle value as unsigned
        }

        return res;
    }

    function convertDataToInt(data: string, len: number) {
        let res = 0;

        if (len === 4) {
            res = (data.charCodeAt(3) << 24 | data.charCodeAt(2) << 16 | data.charCodeAt(1) << 8 | data.charCodeAt(0));
        } else if (len === 2) {
            let cCode = (data.charCodeAt(1) << 8 | data.charCodeAt(0));
            const sign = (cCode & 0x8000);
            if (sign === 0x8000) {
                // Byte 1 = 100000, Byte 0 = 000000
                //  Fill left 16 Bytes with 1
                cCode = cCode | 0xFFFF8000;
            } else {
                // Byte 1 = 000000, Byte 0 = 000000
                //  Fill left 16 Bytes with 0
                cCode = cCode & 0x7FFF;
            }
            res = cCode;
        } else if (len === 1) {
            // JavaScript handles numbers always as 32 bit integer values;
            let cCode = data.charCodeAt(0);
            const sign = (cCode & 0x80);
            if (sign === 0x80) {
                // byte_0 = 100000
                //  Fill left 24 Bytes with 1
                cCode = cCode | 0xFFFFFF80;
            } else {
                // byte_0 = 000000
                //  Fill left 24 Bytes with 0
                cCode = cCode & 0x7F;
            }
            res = cCode;
        }

        return res;
    }
}
