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
        headless: true,
        args:['--no-sandbox','--disable-setuid-sandbox']
    }
};
const { Client, MessageMedia } = require('whatsapp-web.js');
const app = express();
app.use(express.urlencoded({ extended: true }))
const SESSION_FILE_PATH = './session.json';
let client;
let sessionData;
let messageResponde = '';

const requisitoExamenMedicoImg = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093072/mochcun/requisitos-examen-medico.png';
const requisitoAltaPlacaImg = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093070/mochcun/requisitos-alta-placas.png';
const emisionesInformesImg = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093070/mochcun/emisiones-informes.png';
const fisicoInformesImg ='https://res.cloudinary.com/devpom/image/upload/q_10/v1634093069/mochcun/fisico-informes.png';
const requisitoBajaPLacaImg = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093069/mochcun/requisitos-baja-placas.png';
const cursosRequisitosImg = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093068/mochcun/cursos-requisitos-informes.png';
const prorrogaImg = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093069/mochcun/prorroga-verificaciones.png';
const requisitosAltaEmpresa = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093067/mochcun/requisitos-alta-empresa.png';
const licenciaCosto1LetraImg = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093067/mochcun/licencia-costo-1.png';
const licenciaCosto2LetraImg = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093066/mochcun/licencia-costo-2.png';
const precioVerificacionesImg = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093066/mochcun/precios-verificaciones.png';
const requisitosLicenciaImg = 'https://res.cloudinary.com/devpom/image/upload/q_10/v1634093018/mochcun/requisitos-licencia.png';




/**
 * 
 * constantes menu
 * 
    '🔵  Si deseas obtener información sobre ALTA/BAJA de Placas ante la SCT escribe la palabra  *"PLACAS"* \n',
 */

 const firstMessage = [
    '👋 Hola Gracias por contactarnos!\n',
    '🚗 Te estás comunicando a la asistente del verificentro *MOCHCUN* 🚗  \n',
    '\n',
    '🔵  Si deseas obtener la dirección de nuestro centro de verificación vehicular escribe la palabra *"DIRECCION"* \n',
    '🔵  Si deseas obtener información sobre Verificaciones Vehiculares escribe la palabra *"VERIFICACION"* \n',
    '🔵  Si deseas obtener información la licencia federal escribe la palabra *"LICENCIA"* \n',
    '🔵  Si deseas obtener información sobre ALTA/BAJA de Placas ante la SCT escribe la palabra  *"PLACAS"* \n',
    '\n',
    ' Visita nuestro sitio web para más información ⮕ https://mochcun.com',  
    '\n',
].join(' ');

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
    const media = MessageMedia.fromUrl(fileName);
    client.sendMessage(number, media);
}


/**
 * Enviamos un mensaje simple (texto) a nuestro cliente
 * @param {*} number 
 */
const sendMessage = (number = null, text = null) => {
    number = number.replace('@c.us', '');
    number = `${number}@c.us`
    const message = text || `Hola! Gracias por contactarnos`;
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
    let answerSanitized = answer.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    console.log(answerSanitized,"answerSanitized")
    answerSanitized = answerSanitized.toLowerCase();
    
    switch(answerSanitized){
        case 'placas':
            resolve(true)
             placasResponse(from)
            break;
        case 'verificacion':
            resolve(true)
             verificacionResponse(from)
            break;
        case 'licencia':
            resolve(true)
             licenciaResponse(from)
            break;
        case 'direccion':
            resolve(true)
             direccionResponse(from)
            break;
        case 'fisico':
            resolve(true)
            sendMedia(from, fisicoInformesImg)
            break;
        case 'emisiones':
            resolve(true)
            sendMedia(from, emisionesInformesImg)
            break;
        case 'costos':
            resolve(true)
            sendMedia(from, precioVerificacionesImg)
            break;
        case 'prorroga':
            resolve(true)
            sendMedia(from, prorrogaImg)
            break;  
        case 'requisitos licencia':
            resolve(true)
            sendMedia(from, requisitosLicenciaImg)
            break; 
        case 'cursos':
            resolve(true)
            sendMedia(from, cursosRequisitosImg)
            break; 
        case 'costos licencia':
            resolve(true)
            sendMedia(from, licenciaCosto2LetraImg)
            sendMedia(from, licenciaCosto1LetraImg)
            break; 
        case 'medico':
            resolve(true)
            sendMedia(from, requisitoExamenMedicoImg)
            break;    
        default:
            resolve(true)
            //sendMessage(from, firstMessage)
            break;
    }
    

})
/**
 * Funciones de cada una de las respuestas 
 */
 const placasResponse = async (from) => {
    messageResponde = [
        '👋 Has elegido la opcion de placas, ¿En qué estas interesado?  \n',
        '🚘 ALTA DE PLACAS ANTE LA SCT \n',
        '🚘 BAJA DE PLACAS ANTE LA SCT\n',
    ].join(' ')
    sendMessage(from, messageResponde)
}

const direccionResponse = async (from) => {
    messageResponde = [
        '🚘 Estamos ubicados en Av. Kinik Lote 1-11, 1-12, 1-13 Mza. 1 Reg. 97 Zona Industrial. Entre la Av. Andres Q.roo y la Av. Chichen sobre la kinik casi llegando a la Chichen. Rejas Rojas. Frente a la Cerveceria Moctezuna. \n',
        'https://g.page/Mochcun?share \n',
    ].join(' ')
    sendMessage(from, messageResponde)
}

const verificacionResponse = async (from) => {
    messageResponde = [
        '🚘 Haz elegido la opción de verificacion, ¿En qué estas interesado? \n',
        '✔️ Para precio de Verificaciones escribe *COSTOS* \n',
        '✔️ Para información de Verificacion de Emisiones Contaminantes escribe *EMISIONES*\n',
        '✔️ Para información de Verificacion de Fisico Mécanica escribe *FISICO*\n',
        '✔️ Tienes duda si tu vehiculo cuenta con prorroga? escribe *PRORROGA*\n',
    ].join(' ')
    sendMessage(from, messageResponde)
}

const licenciaResponse = async (from) => {
    messageResponde = [
        '🚘 Haz elegido la opción de licencia, ¿En qué estas interesado? \n',
        '✔️ Para información de cursos de capacitacion escribe *CURSOS* \n',
        '✔️ Para información de examen medico psico fisico escribe *MEDICO*\n',
        '✔️ Para requisitos de la licencia escribe *Requisitos licencia*\n',
        '✔️ Para costos de gestoria de la licencia escribe *costos licencia*\n',
    ].join(' ')
    sendMessage(from, messageResponde)
}

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
    await workbook.xlsx.readFile(pathExcel)
    .then(() => {
        console.log("read");
    })
    .catch((err) => {
        console.log("err", err);
    });

    // fetch sheet by name
    const worksheet = workbook.getWorksheet('Hoja1');

// fetch sheet by id
// INFO: Be careful when using it!
// It tries to access to `worksheet.id` field. Sometimes (really very often) workbook has worksheets with id not starting from 1.
// For instance It happens when any worksheet has been deleted.
// It's much more safety when you assume that ids are random. And stop to use this function.
// If you need to access all worksheets in a loop please look to the next example.
//const worksheet = workbook.getWorksheet(1);

// access by `worksheets` array:
//const worksheet =  workbook.worksheets[0]; //the first one;

   // const worksheet = workbook.getWorksheet(1);
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

    workbook.xlsx.writeFile(pathExcel) 
    .then(() => {

        console.log("saved");
    })
    .catch((err) => {
        console.log("err", err);
    });

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
                workbook.xlsx.writeFile(pathExcel)
                .then(() => {

                    console.log("saved");
                })
                .catch((err) => {
                    console.log("err", err);
                });
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