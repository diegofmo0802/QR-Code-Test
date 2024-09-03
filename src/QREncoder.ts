import Info from "./QRInfo.js";
import QRMatrix from "./QRMatrix.js";
import GF28 from "./GF28.js";

export class QREncoder {
    public static readonly bytesLength = {
        numeric:      {'1-9': 10, '10-26': 12, '27-40': 14},
        alphanumeric: {'1-9': 9,  '10-26': 11, '27-40': 13},
        byte:         {'1-9': 8,  '10-26': 16, '27-40': 16},
        kanji:        {'1-9': 8,  '10-26': 10, '27-40': 12},
    }
    public static readonly encodingMode: QREncoder.EncodingMode = {
        numeric:      [0, 0, 0, 1],
        alphanumeric: [0, 0, 1, 0],
        byte:         [0, 1, 0, 0],
        kanji:        [1, 0, 0, 0],
        eci:          [0, 1, 1, 1]
    }
    public constructor(
        public readonly version: QRMatrix.Version = 1,
        public readonly errorCorrectionLevel: QRMatrix.ErrorCorrectionLevel = 'L'
    ) {}
    public get maxCapacity() {
        return Info.Capacity[this.version][this.errorCorrectionLevel] ?? 0;
    }
    /**
     * detect the mode to encode the input string
     * @param input the input string
     * @returns the mode of the input string
    */
    public detectMode(input: string): QREncoder.DataType {
        const numeric = /^\d*$/;
        const alphanumeric = /^[\dA-Z $%*+\-./:]*$/;
        const latin1 = /^[\x00-\xff]*$/;
        const kanji = /^[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}]*$/u;
        if (numeric.test(input))           return 'numeric';
        else if (alphanumeric.test(input)) return 'alphanumeric';
        else if (latin1.test(input))       return 'byte';
        else if (kanji.test(input))        return 'kanji';
        else                               return 'byte'; //'eci';
    }
    /**
     * get the byteLength necessary to encode the input string
     * @param mode the mode of the input string
     * @returns the byteLength
    */
    public getBytesLength(mode: QREncoder.DataType): number {
        const type = mode === 'eci' ? 'byte' : mode;
        const selected = QREncoder.bytesLength[type];
        if (this.version >= 1 && this.version <= 9) {
            return selected['1-9'];
        } else if (this.version >= 10 && this.version <= 26) {
            return selected['10-26'];
        } else if (this.version >= 27 && this.version <= 40) {
            return selected['27-40'];
        } else throw new Error('Invalid version');
    }
    public encode(input: string): QRMatrix.Bin[] {
        const result: QRMatrix.Bin[] = [];
    
        const mode = this.detectMode(input);
        result.push(...this.getModeIndicator(mode));
        result.push(...this.getSizeIndicator(input.length, mode));
        
        const data = this.encodeInputData(input, mode);
        result.push(...data);
    
        result.push(...Array(8 - (result.length % 8)).fill(0));
    
        const byteData: number[] = [];
        for (let i = 0; i < result.length; i += 8) {
            const byte = parseInt(result.slice(i, i + 8).join(''), 2);
            byteData.push(byte);
        }
        const fullDataWithEC = this.getErrorCorrected(byteData);
        const finalResult: QRMatrix.Bin[] = [];
        fullDataWithEC.forEach(byte => {
            const binString = byte.toString(2).padStart(8, '0');
            finalResult.push(...binString.split('').map(bit => bit === '0' ? 0 : 1));
        });
        return finalResult;
    }
    public getModeIndicator(mode: QREncoder.DataType): QRMatrix.Bin[] {
        return QREncoder.encodingMode[mode];
    }
    public getSizeIndicator(size: number, mode: QREncoder.DataType): QRMatrix.Bin[] {
        const byteLength = this.getBytesLength(mode);
        return this.toBinary(size, byteLength);
    }
    public toBinary(value: number, byteLength: number): QRMatrix.Bin[] {
        const resultString = value.toString(2).padStart(byteLength, '0');
        return resultString.split('').map(bit => bit === '0' ? 0 : 1);
    }
    public encodeInputData(input: string, mode: QREncoder.DataType): QRMatrix.Bin[] {
        switch (mode) {
            case 'numeric': return this.encodeNumeric(input);
            case 'alphanumeric': return this.encodeAlphanumeric(input);
            case 'byte': return this.encodeByte(input);
            case 'kanji': return this.encodeKanji(input);
            default: throw new Error('Modo de codificación no soportado');
        }
    }
    public encodeNumeric(input: string): QRMatrix.Bin[] {
        const binaryData: QRMatrix.Bin[] = [];
        for (let i = 0; i < input.length; i += 3) {
            const numStr = input.substr(i, 3);
            const num = parseInt(numStr, 10);
            const bitLength = numStr.length === 3 ? 10 : (numStr.length === 2 ? 7 : 4);
            binaryData.push(...this.toBinary(num, bitLength));
        }
        return binaryData;
    }
    public encodeAlphanumeric(input: string): QRMatrix.Bin[] {
        const binaryData: QRMatrix.Bin[] = [];
        const charMap = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
        for (let i = 0; i < input.length; i += 2) {
            const firstChar = charMap.indexOf(input[i]);
            const secondChar = i + 1 < input.length ? charMap.indexOf(input[i + 1]) : -1;
            if (secondChar === -1) {
                binaryData.push(...this.toBinary(firstChar, 6));
            } else {
                const value = firstChar * 45 + secondChar;
                binaryData.push(...this.toBinary(value, 11));
            }
        }
        return binaryData;
    }
    public encodeByte(input: string): QRMatrix.Bin[] {
        const binaryData: QRMatrix.Bin[] = [];
        for (let i = 0; i < input.length; i++) {
            const byte = input.charCodeAt(i);
            binaryData.push(...this.toBinary(byte, 8));
        }
        return binaryData;
    }
    public encodeKanji(input: string): QRMatrix.Bin[] {
        const binaryData: QRMatrix.Bin[] = [];
        for (let i = 0; i < input.length; i++) {
            const charCode = input.charCodeAt(i);
            let value = -1;
            if (charCode >= 0x8140 && charCode <= 0x9FFC) {
                value = charCode - 0x8140;
            } else if (charCode >= 0xE040 && charCode <= 0xEBBF) {
                value = charCode - 0xC140;
            }
            if (value !== -1) {
                const msb = (value >> 8) & 0xFF;
                const lsb = value & 0xFF;
                const combined = (msb * 0xC0) + lsb;
                binaryData.push(...this.toBinary(combined, 13));
            }
        }
        return binaryData;
    }
    public getBlockSize(): number {
        // Obtener el tamaño del bloque basado en la versión y el nivel de corrección de errores
        // (Este método necesita ser implementado basado en las especificaciones del QR)
        return 26; // Ejemplo para la versión 1, nivel L
    }
    public getCorrectionWSize(): number {
        // Obtener el número de palabras de código de corrección de errores
        // (Este método necesita ser implementado basado en las especificaciones del QR)
        return 7; // Ejemplo para la versión 1, nivel L
    }
    public interleaveBlocks(dataBlocks: number[][], errorCorrectionBlocks: number[][]): number[] {
        const result: number[] = [];
        const maxBlockSize = Math.max(...dataBlocks.map(block => block.length));
        for (let i = 0; i < maxBlockSize; i++) {
            for (let block of dataBlocks) {
                if (i < block.length) result.push(block[i]);
            }
        }
        for (let i = 0; i < errorCorrectionBlocks[0].length; i++) {
            for (let block of errorCorrectionBlocks) {
                result.push(block[i]);
            }
        }
        return result;
    }
    public divideInBlocks(data: number[], size: number): number[][] {
        const blocks: number[][] = [];
        for (let i = 0; i < data.length; i += size) {
            blocks.push(data.slice(i, i + size));
        }
        return blocks;
    }
    public polynomialGenerator(totalWords: number): number[] {
        let g: number[] = [1];
        for (let i = 0; i < totalWords; i++) {
            g = GF28.polyMultiply(g, [1, GF28.exp(i)]);
        }
        return g;
    }
    public getErrorCorrected(data: number[]): number[] {
        const blockSize = this.getBlockSize();
        const errorCorrectionSize = this.getCorrectionWSize();
        const dataBlocks = this.divideInBlocks(data, blockSize);
        const errorCorrectionBlocks = dataBlocks.map((block) => {
            return this.newCorrectionBlock(block, errorCorrectionSize);
        })
        return this.interleaveBlocks(dataBlocks, errorCorrectionBlocks);
    }
    public newCorrectionBlock(block: number[], size: number): number[] {
        const generator = this.polynomialGenerator(size);
        const correctionBlock = new Array(size).fill(0);
        for (let i = 0; i < block.length; i++) {
            const factor = block[i] ^ correctionBlock[0];
            correctionBlock.shift();
            correctionBlock.push(0);

            for (let j = 0; j < generator.length; j++) {
                correctionBlock[j] ^= GF28.multiply(generator[j], factor);
            }
        }
        return correctionBlock;
    }
}
export namespace QREncoder {
    export type Mode = 'numeric' | 'alphanumeric' | 'byte' | 'kanji' | 'eci';
    export interface EncodingMode {
        numeric: QRMatrix.Bin[];
        alphanumeric: QRMatrix.Bin[];
        byte: QRMatrix.Bin[];
        kanji: QRMatrix.Bin[];
        eci: QRMatrix.Bin[];
    }
    export type DataType = keyof EncodingMode;
}

export default QREncoder;