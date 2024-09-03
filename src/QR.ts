import QRMatrix from "./QRMatrix.js";

export class QR {
    public readonly matrix: QRMatrix;
    constructor(version: QRMatrix.Version = 1, errorCorrectionLevel: QRMatrix.ErrorCorrectionLevel = 'L') {
        this.matrix = new QRMatrix(version, errorCorrectionLevel);
    }
    public toString() {
        const blackStyle = "border-radius: 50%;color: white; background-color: black; padding: 0;";
        const whiteStyle = "border-radius: 50%;color: black; background-color: white; padding: 0;";
        const testStyle  = "border-radius: 50%;color: white; background-color: red; padding: 0;";
        
        let result = '';
        const styles = [];
        for (const row of this.matrix.data) {
            for (const bit of row) {
                result += `%c  `;//@ts-ignore
                styles.push(bit == -1 ? testStyle : bit ? blackStyle : whiteStyle);
            }
            result += '\n';
        }
        console.log(result, ...styles);
    }
}
export default QR;