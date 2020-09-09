const cheerio = require('cheerio');
const fetch = require('node-fetch');
const twilio = require('twilio');

const emptyChar = '⠀';
//const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


fetch("http://udim.koeri.boun.edu.tr/zeqmap/xmlt/son24saat.xml")
    .then(res => res.text())
    .then(res => evalRes(res));

let evalRes = (res) => {
    const $ = cheerio.load(res, { xmlMode: true });
    let earthquakes = getEarthquakes($);
    const smsText = createSmsText($, earthquakes);
    // writeSmsToFile(smsText);
    // sendSmsToRecievers(smsText);
}

let getEarthquakes = ($) => {
    return $('earhquake');
}

let createSmsText = ($, earthquakes) => {
    let smsTextArray = [];
    earthquakes.each((index, item) => {
        createSmsLineForEarthQuake($, item);
        //smsTextArray.push(createSmsLineForEarthQuake($, item));
    });
    return `${emptyChar}\n${emptyChar}\n${smsTextArray.join('\n')}\n${emptyChar}\n${emptyChar}`;
}

let createSmsLineForEarthQuake = ($, earthquake) => {
    let date = $(earthquake).attr("name").trim();
    let location = $(earthquake).attr("lokasyon").trim();
    let lat = $(earthquake).attr("lat").trim();
    let lng = $(earthquake).attr("lng").trim();
    let mag = $(earthquake).attr("mag").trim();
    let depth = $(earthquake).attr("Depth").trim();
    console.log(date, location, lat, lng, mag, depth);
    // let name = $(earthquake).children(".name").text();
    // name = name === 'GRAM ALTIN' ? 'ALTIN' : name;
    // let value = $(earthquake).children(".value").text();
    // let change = $(earthquake).children(".change").text().trim();
    // let isChangedPositively = !change.includes("-");
    // let changeEmoji = isChangedPositively ? "✅" : "🔻";
    // return `${changeEmoji} ${change} ${value} ${name}`;
}

let writeSmsToFile = (sms) => {
    fs.writeFile('sms.txt', sms, function(err) {
        if (err) return console.log(err);
        console.log('Written sms.txt');
    });
}

let sendSmsToRecievers = (smsText) => {
    const receivers = process.env.MSISDN_RECEIVERS_DELIMITED_WITH_SEMICOLON;
    receivers.split(';').forEach(receiver => {
        client.messages.create({
                to: receiver,
                from: process.env.MSISDN_SENDER,
                body: smsText
            })
            .then(message => console.log('Sent', 'SID', message.sid))
            .catch(error => console.log('Sending error', error));
    });

}