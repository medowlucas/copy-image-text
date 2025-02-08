import { app, BrowserWindow, ipcMain } from 'electron';
import Tesseract from 'tesseract.js';
import Jimp from 'jimp';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obtenha o diretório atual usando import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true, // Permite usar require() no front
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html'); // Carrega a interface
});

ipcMain.on('process-image', async (event, imgDataUrl) => {
    try {
        // Converte a imagem da área de transferência em um buffer para o Jimp
        const imgBuffer = Buffer.from(imgDataUrl.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const image = await Jimp.read(imgBuffer);

        // Melhora a imagem (opcional, aumentar contraste, etc)
        image.greyscale()
            .contrast(0.5)
            .normalize();

        // Salva a imagem temporária
        const imagePath = join(__dirname, 'temp.png');
        await image.writeAsync(imagePath);

        // Realiza OCR na imagem
        Tesseract.recognize(imagePath, 'por', {
            logger: (m) => console.log(m),
        })
        .then(({ data: { text } }) => {
            event.reply('ocr-result', text.trim());
        })
        .catch((error) => {
            console.error('Erro no OCR:', error);
            event.reply('ocr-result', 'Erro ao processar a imagem.');
        })
        .finally(() => {
            fs.unlinkSync(imagePath); // Apaga a imagem temporária
        });
    } catch (error) {
        console.error('Erro ao processar imagem:', error);
        event.reply('ocr-result', 'Erro ao processar a imagem.');
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
