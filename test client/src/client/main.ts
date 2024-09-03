import QR from "../../../build/QR.js";
import QREncoder from "../../../build/QREncoder.js";

const qr = new QR(1, 'L');

const encoder = new QREncoder(1, 'L');
const data = encoder.encode('hallo');

qr.matrix.setData(data);

console.log(qr.toString());
console.log(data);