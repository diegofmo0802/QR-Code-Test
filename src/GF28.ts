export class GF28 {
    private static logTable: number[] = [];
    private static antilogTable: number[] = [];

    static {
        let value = 1;
        for (let i = 0; i < 256; i++) {
            this.logTable[value] = i;
            this.antilogTable[i] = value;
            value <<= 1;
            if (value >= 256) value ^= 283;
        }
    }

    public static multiply(a: number, b: number): number {
        if (a === 0 || b === 0) return 0;
        const logA = this.logTable[a];
        const logB = this.logTable[b];
        return this.antilogTable[(logA + logB) % 255];
    }

    public static divide(dividend: number, divisor: number): number {
        if (divisor === 0) throw new Error("Division by zero");
        if (dividend === 0) return 0;
        const logDividend = this.logTable[dividend];
        const logDivisor = this.logTable[divisor];
        return this.antilogTable[(logDividend - logDivisor + 255) % 255];
    }

    public static exp(x: number): number {
        return this.antilogTable[x % 255];
    }

    public static polyMultiply(a: number[], b: number[]): number[] {
        const result = new Array(a.length + b.length - 1).fill(0);
        for (let i = 0; i < a.length; i++) {
            for (let j = 0; j < b.length; j++) {
                result[i + j] ^= this.multiply(a[i], b[j]);
            }
        }
        return result;
    }
}
export default GF28;