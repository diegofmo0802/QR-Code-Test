import Info from "./QRInfo.js";

export class QRMatrix {
    public readonly size: number;
    public readonly matrix: QRMatrix.MatrixData;
    constructor(
        public readonly version: QRMatrix.Version,
        public readonly errorCorrectionLevel: QRMatrix.ErrorCorrectionLevel = 'L'
    ) {
        this.size = this.getSize(version);
        this.matrix = this.getEmptyMatrix(this.size);
        this.drawPositionPattern();
        this.drawSynchroPattern();
        this.drawAlignmentPattern();
/*         for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.matrix[i][j] === 0)//@ts-ignore
                this.matrix[i][j] = this.isReserved(i, j) ? -1 : 0;
            }
        } */
    }
    public get data(): QRMatrix.MatrixData {
        return this.matrix;
    }
    public setData(codedData: QRMatrix.Bin[]): void {
        let row = this.size - 1;
        let col = this.size - 1;
        let direction: 'up' | 'down' = 'up';
        let bitIndex = 0;
        while (col > 0) {
            for (let i = 0; i < 2; i++) {
                if (!this.isReserved(row, col - i) && bitIndex < codedData.length) {
                    this.matrix[row][col - i] = codedData[bitIndex];
                    bitIndex++;
                }
            }
    
            if (direction === 'up') {
                if (row === 0) {
                    direction = 'down';
                    col -= 2;
                } else row--;
            } else {
                if (row === this.size - 1) {
                    direction = 'up';
                    col -= 2;
                } else row++;
            }
        }
    }
    public isReservedToPosition(row: number, column: number): boolean {
        if (row < 8 && column < 8) return true;
        if (row >= this.size - 8 && column < 8) return true;
        if (row < 8 && column >= this.size - 8) return true;
        return false;
    }
    public isReserverToSynchro(row: number, column: number): boolean {
        if (row === 6 && column > 7 && column < this.size - 8) return true;
        if (row > 7 && row < this.size - 8 && column === 6) return true;
        return false;
    }
    public isReservedToAlignment(row: number, column: number): boolean {
        const positions = this.getAlignPatterPositions();
        for (const ap_row of positions) {
            for (const ap_column of positions) {
                if (this.isReservedToPosition(ap_row, ap_column)) continue;
                if (
                    row >= ap_row - 2 && row <= ap_row + 2 &&
                    column >= ap_column - 2 && column <= ap_column + 2
                ) return true;
            }
        }
        return false;
    }
    public isReservedToFormat(row: number, column: number): boolean {
        if (row === 8 && column <= 8) return true;
        if (row <= 8 && column === 8) return true;
        if (row === 8 && column >= this.size - 8) return true;
        if (row >= this.size - 8 && column === 8) return true;
        return false;
    }
    public isReservedToVersion(row: number, column: number): boolean {
        if (this.version < 7) return false;
        if (row <= 5 && column >= this.size - 11 && column <= this.size - 9) return true;
        if (row >= this.size - 11 && row <= this.size - 9 && column <= 5) return true;
        return false;
    }
    public isReserved(row: number, column: number): boolean {
        if (this.isReservedToPosition(row, column)) return true;
        if (this.isReserverToSynchro(row, column)) return true;
        if (this.isReservedToAlignment(row, column)) return true;
        if (this.isReservedToFormat(row, column)) return true;
        if (this.isReservedToVersion(row, column)) return true;
        return false;
    }
    public drawFormatInfo(errorCorrectionLevel: number, maskPattern: number): void {
        const formatInfo = this.getFormatInfoBits(errorCorrectionLevel, maskPattern);
        for (let i = 0; i <= 5; i++) {
            this.matrix[8][i] = formatInfo[i];
            this.matrix[i][8] = formatInfo[i];
        }
        this.matrix[8][7] = formatInfo[6];
        this.matrix[8][8] = formatInfo[7];
        this.matrix[7][8] = formatInfo[8];
        for (let i = 9; i < 15; i++) {
            this.matrix[14 - i][8] = formatInfo[i];
            this.matrix[8][i - 8] = formatInfo[i];
        }
        for (let i = 0; i < 8; i++) {
            this.matrix[this.size - 1 - i][8] = formatInfo[i];
            this.matrix[8][this.size - 1 - i] = formatInfo[i];
        }
    }
    public drawVersionInfo() {
        if (this.version < 7) return; 
        const versionInfoBits = this.getVersionInfoBits(this.version);
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 3; j++) {
                this.matrix[this.size - 11 + j][i] = versionInfoBits[i * 3 + j];
                this.matrix[i][this.size - 11 + j] = versionInfoBits[i * 3 + j];
            }
        }
    }
    public drawSynchroPattern(): void {
        const start = 7;
        const end = this.size - 7;
        let draw: boolean = false;
        for (let i = start; i < end; i++) {
            this.matrix[i][start - 1] = draw ? 1 : 0;
            this.matrix[start - 1][i] = draw ? 1 : 0;
            draw = !draw;
        }
    }
    public drawAlignmentPattern(): void {
        const alignmentPattern: QRMatrix.MatrixData = [
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1],
        ];
        const positions = this.getAlignPatterPositions();
        for (const row of positions) {
            for (const column of positions) {
                if (this.isReservedToPosition(row, column)) continue;
                this.draw(alignmentPattern, row - 2, column - 2);
            }
        }
    }
    protected getAlignPatterPositions(): number[] {
        if (this.version < 2) return [];
        const positions = [6];
        const quantity = Math.floor((this.version - 1) / 7) + 2;
        let step = Math.floor((this.size - 13) / quantity);
        for (let i = 1; i < quantity - 1; i++) {
            positions.push(6 + i * step);
        }
        positions.push(this.size - 7);
        return positions;
    }
    public drawPositionPattern(): void {
        const positionPattern: QRMatrix.MatrixData = [
            [1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1],
        ];
        this.draw(positionPattern, 0, 0);
        this.draw(positionPattern, 0, this.size - 7);
        this.draw(positionPattern, this.size - 7, 0);
    }
    public draw(figure: QRMatrix.MatrixData, row: number, column: number): void {
        let currentCol = column;
        let currentRow = row;
        for (const row of figure) {
            for (const bit of row) {
                this.matrix[currentRow][currentCol] = bit;
                currentCol++;
            }
            currentRow++; currentCol = column;
        }
    }
    public getSize(version: number): number {
        if (version < 1) version = 1;
        else if (version > 40) version = 40;
        const size = 17 + 4 * version;
        return size;
    }
    /**
     * generate an empty matrix
     * @param size the size of the matrix
     * @returns the generated matrix
     */
    public getEmptyMatrix(size: number): QRMatrix.MatrixData {
        const matrix: QRMatrix.MatrixData = [];
        for (let i = 0; i < size; i++) {
            matrix[i] = new Array(size).fill(0);
        }
        return matrix;
    }
    public getFormatInfoBits(errorCorrectionLevel: number, maskPattern: number): QRMatrix.Bin[] {
        let formatBits = (errorCorrectionLevel << 3) | maskPattern;
        let formatInfo = formatBits << 10;
        const generator = 0b10100110111;
        for (let i = 4; i >= 0; i--) {
            if ((formatInfo >> (i + 10)) & 1) {
                formatInfo ^= generator << i;
            }
        }
        formatInfo = ((formatBits << 10) | formatInfo) ^ 0b101010000010010;
        return Array.from({ length: 15 }, (_, i) => (formatInfo >> i) & 1).reverse()  as QRMatrix.Bin[];
    }
    public getVersionInfoBits(version: number): QRMatrix.Bin[] {
        let versionBits = version << 12;
        const generator = 0b1111100100101;
        for (let i = 5; i >= 0; i--) {
            if ((versionBits >> (i + 12)) & 1) {
                versionBits ^= generator << i;
            }
        }
        versionBits = (version << 12) | versionBits;
        return Array.from({ length: 18 }, (_, i) => (versionBits >> i) & 1).reverse() as QRMatrix.Bin[];
    }
}

export namespace QRMatrix {
    export type Version = 1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40;
    export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
    export type Bin = 0 | 1;
    export type MatrixData = Bin[][];
}

export default QRMatrix;