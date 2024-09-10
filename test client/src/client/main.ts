import QR from '../../../build/QR.js';

const contentIn = document.querySelector('#in') as HTMLTextAreaElement;
const levelIn = document.querySelector('#eccLevel') as HTMLSelectElement;
const maskIn = document.querySelector('#mask') as HTMLSelectElement;
const generateBtn = document.querySelector('#generate') as HTMLButtonElement;
const error = document.querySelector('#error') as HTMLParagraphElement;
const img = document.querySelector('#qr') as HTMLImageElement;

async function generate() {
    const content = contentIn.value;
    const level = levelIn.value;
    const mask = parseInt(maskIn.value);
    if (isNaN(mask) || mask < 0 || mask > 7) {
        error.textContent = 'Invalid mask';
        return;
    }
    console.log('Generating QR code...')
    try {
        if (!QR.isSupportedEccLevel(level)) throw new Error('Invalid ECC level');
        if (!QR.isSupportedMask(mask)) throw new Error('Invalid mask');
        const qr = new QR(content, {
            minVersion: 1,
            eccLevel: level,
            mask: mask,
            icon: true
        });
        error.textContent = '';
        console.log('QR code generated, version:', qr.version, ', eccLevel:', qr.eccLevel);
        console.log('Displaying QR code...');
        const drawer = qr.imageDrawer;
        if (!drawer) throw new Error('No image drawer');
        //drawer.debugMode = true;
        drawer.moduleRadius = '50%';
        drawer.moduleMargin = '20%';
        await drawer.addImage('./Logo.svg');
        drawer.size = 400;
        img.src = drawer.dataUrl;
        console.log('QR code displayed')
        if ("new BarcodeDetector" in globalThis) {
            console.log("trying to read QR code...");
            const qrReader = new BarcodeDetector()

        }
    } catch (e) {
        console.error('Error generating QR code:', e);
        error.textContent = e + "";
    }
}

generateBtn.addEventListener('click', () => generate());
generate();

//@ts-ignore
window.QR = QR;