/**
 * ⚡⚡⚡ DECLARAMOS LAS LIBRERIAS y CONSTANTES A USAR! ⚡⚡⚡
 */
const fs = require('fs');
const mimeDb = require('mime-db')
const express = require('express');
const moment = require('moment');
const ora = require('ora');
const chalk = require('chalk');
const ExcelJS = require('exceljs');
const qrcode = require('qrcode-terminal');
const { flowConversation } = require('./conversation')
const puppeteerOptions = {
    puppeteer:{
        headless: false,
        args:['--no-sandbox','--disable-setuid-sandbox']
    }
};
const { Client, MessageMedia } = require('whatsapp-web.js');
const app = express();
app.use(express.urlencoded({ extended: true }))
const SESSION_FILE_PATH = './session.json';
let client;
let sessionData;

/**
 * Guardamos archivos multimedia que nuestro cliente nos envie!
 * @param {*} media 
 */
const saveMedia = (media) => {

    const extensionProcess = mimeDb[media.mimetype]
    const ext = extensionProcess.extensions[0]
    fs.writeFile(`./media/${media.filename}.${ext}`, media.data, { encoding: 'base64' }, function (err) {
        console.log('** Archivo Media Guardado **');
    });
}

/**
 * Enviamos archivos multimedia a nuestro cliente
 * @param {*} number 
 * @param {*} fileName 
 */
const sendMedia = (number, fileName) => {
    number = number.replace('@c.us', '');
    number = `${number}@c.us`
    const media = MessageMedia.fromFilePath(`./mediaSend/${fileName}`);
    client.sendMessage(number, media);
}

/**
 * Enviamos un mensaje simple (texto) a nuestro cliente
 * @param {*} number 
 */
const sendMessage = (number = null, text = null) => {
    number = number.replace('@c.us', '');
    number = `${number}@c.us`
    const message = text || `Hola! Gracias por contac`;
    client.sendMessage(number, message);
    readChat(number, message)
    console.log(`${chalk.red('⚡⚡⚡ Enviando mensajes....')}`);
}

/**
 * Escuchamos cuando entre un mensaje
 */
const listenMessage = () => {
    client.on('message', async msg => {
        const { from, to, body } = msg;
        //34691015468@c.us
        console.log(msg.hasMedia);
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            saveMedia(media);
            // do something with the media data here
        }

        await greetCustomer(from);

        console.log(body);

        await replyAsk(from, body);

        // await readChat(from, body)
        // console.log(`${chalk.red('⚡⚡⚡ Enviando mensajes....')}`);
        // console.log('Guardar este número en tu Base de Datos:', from);

    });
}

/**
 * Response a pregunta
 */

const replyAsk = (from, answer) => new Promise((resolve, reject) => {
    console.log(`---------->`, answer);
    if (answer === 'placas' || answer === 'PLACAS' || answer === 'Placas'  ) {
        resolve(true)
    
            const firstMessage = [
                '👋 Has elegido la opcion de placas \n',
            ].join(' ')
            sendMessage(from, firstMessage)
    }
    if (answer === 'VERIFICACION' || answer === 'Verificación' || answer === 'verificacion' || answer === 'verificación'  ) {
        resolve(true)
    
            const firstMessage = [
                '👋 Has elegido la opcion de verificacion \n',
            ].join(' ')
            sendMessage(from, firstMessage)
    }
    if (answer === 'licencia' || answer === 'LICENCIA' || answer === 'Licencia'  ) {
        resolve(true)
    
            const firstMessage = [
                '👋 Has elegido la opcion de licencia \n',
            ].join(' ')
            sendMessage(from, firstMessage)
    }
    if (answer === 'DIRECCION' || answer === 'direccion' || answer === 'Dirección' || answer === 'dirección'  ) {
        resolve(true)
    
            const firstMessage = [
                '👋 Has elefido la opcion de pendejeta \n',
                'Recuerda subscribirte a mi canal de YT',
                '------',
                '------',
                'Veo que es la primera vez que nos escribes ¿Quieres que te envie un MEME?',
                'Responde Quieromeme'
            ].join(' ')
            sendMessage(from, firstMessage)
    }

})

/**
 * Revisamos si tenemos credenciales guardadas para inciar sessio
 * este paso evita volver a escanear el QRCODE
 */
const withSession = () => {
    // Si exsite cargamos el archivo con las credenciales
    const spinner = ora(`Cargando ${chalk.yellow('Validando session con Whatsapp... :v ')}`);
    sessionData = require(SESSION_FILE_PATH);
    spinner.start();
    client = new Client({
        session: sessionData
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        spinner.stop();

        // sendMessage();
        // sendMedia();

        connectionReady();

    });



    client.on('auth_failure', () => {
        spinner.stop();
        console.log('** F Error de autentificacion vuelve a generar el QRCODE (Borrar el archivo session.json) **');
    })


    client.initialize();
}

/**
 * Generamos un QRCODE para iniciar sesion
 */
const withOutSession = () => {
    console.log('No tenemos session guardada');
    client = new Client(puppeteerOptions);
    client.on('qr', qr => {
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        connectionReady();
    });

    client.on('auth_failure', () => {
        console.log('** Error de autentificacion vuelve a generar el QRCODE **');
    })


    client.on('authenticated', (session) => {
        // Guardamos credenciales de de session para usar luego
        sessionData = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.log(err);
            }
        });
    });

    client.initialize();
}

const connectionReady = () => {
    listenMessage();
    readExcel();
}

/**
 * Difundir mensaje a clientes
 */
const readExcel = async () => {
    const pathExcel = `./chats/clientes-saludar.xlsx`;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(pathExcel);
    const worksheet = workbook.getWorksheet(1);
    const columnNumbers = worksheet.getColumn('A');
    columnNumbers.eachCell((cell, rowNumber) => {
        const numberCustomer = cell.value

        const columnDate = worksheet.getRow(rowNumber);
        let prevDate = columnDate.getCell(2).value;
        prevDate = moment.unix(prevDate);
        const diffMinutes = moment().diff(prevDate, 'minutes');

        // Si ha pasado mas de 60 minuitos podemos enviar nuevamente
        if (diffMinutes > 60) {
            sendMessage(numberCustomer)
            columnDate.getCell(2).value = moment().format('X')
            columnDate.commit();

        }
    });

    workbook.xlsx.writeFile(pathExcel);

}


/**
 * Guardar historial de conversacion
 * @param {*} number 
 * @param {*} message 
 */
const readChat = async (number, message) => {
    const pathExcel = `./chats/${number}.xlsx`;
    const workbook = new ExcelJS.Workbook();
    const today = moment().format('DD-MM-YYYY hh:mm')

    if (fs.existsSync(pathExcel)) {
        /**
         * Si existe el archivo de conversacion lo actualizamos
         */
        const workbook = new ExcelJS.Workbook();
        workbook.xlsx.readFile(pathExcel)
            .then(() => {
                const worksheet = workbook.getWorksheet(1);
                const lastRow = worksheet.lastRow;
                var getRowInsert = worksheet.getRow(++(lastRow.number));
                getRowInsert.getCell('A').value = today;
                getRowInsert.getCell('B').value = message;
                getRowInsert.commit();
                workbook.xlsx.writeFile(pathExcel);
            });

    } else {
        /**
         * NO existe el archivo de conversacion lo creamos
         */
        const worksheet = workbook.addWorksheet('Chats');
        worksheet.columns = [
            { header: 'Fecha', key: 'number_customer' },
            { header: 'Mensajes', key: 'message' }
        ];
        worksheet.addRow([today, message]);
        workbook.xlsx.writeFile(pathExcel)
            .then(() => {

                console.log("saved");
            })
            .catch((err) => {
                console.log("err", err);
            });
    }
}

/**
 * Saludos a primera respuesta
 * @param {*} req 
 * @param {*} res 
 */

const greetCustomer = (from) => new Promise((resolve, reject) => {
    from = from.replace('@c.us', '');

    const pathExcel = `./chats/${from}@c.us.xlsx`;
    if (!fs.existsSync(pathExcel)) {
        const firstMessage = [
            '👋 Hola Gracias por contactarnos!\n',
            '🚗 Te estás comunicando a la asistente del verificentro *MOCHCUN* 🚗  \n',
            '\n',
            '🔵  Si deseas obtener la dirección de nuestro centro de verificación vehicular escribe la palabra *"DIRECCION"* \n',
            '🔵  Si deseas obtener información sobre Verificaciones Vehiculares escribe la palabra *"VERIFICACION"* \n',
            '🔵  Si deseas obtener información la licencia federal escribe la palabra *"LICENCIA"* \n',
            '🔵  Si deseas obtener información sobre ALTA/BAJA de Placas ante la SCT escribe la palabra  *"PLACAS"* \n',
            '\n',
            '✅ Información general sobre los cursos de capacitación vehicular ⮕ https://bit.ly/3od1Bl6',
            ' Visita nuestro sitio web para más información ⮕ https://bit.ly/3pg1Q02',
            
            '\n',
        ].join(' ')

        sendMessage(from, firstMessage)
        // sendMedia(from, 'curso-1-1.png')
        // sendMedia(from, 'curso-2.png')
        // sendMedia(from, 'curso-3.png')
    }
    resolve(true)
})

/**
 * Controladores
 */

const sendMessagePost = (req, res) => {
    const { message, number } = req.body
    console.log(message, number);
    sendMessage(number, message)
    res.send({ status: 'Enviado!' })
}

/**
 * Rutas
 */

app.post('/send', sendMessagePost);

/**
 * Revisamos si existe archivo con credenciales!
 */
(fs.existsSync(SESSION_FILE_PATH)) ? withSession() : withOutSession();


app.listen(process.env.PORT || 9000, () => {
    console.log('Server ready!');
})