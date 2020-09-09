const cheerio = require('cheerio');
const fetch = require('node-fetch');
const twilio = require('twilio');
const fs = require('fs');
require('dotenv').config();

const emptyChar = '⠀';

const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

fetch("http://udim.koeri.boun.edu.tr/zeqmap/xmlt/son24saat.xml")
    .then(res => res.text())
    .then(res => evalRes(res))
    .catch(err => console.log(err));


let comparer = (otherArray) => {
    return function(current) {
        return otherArray.filter(function(other) {
            return other.date === current.date
        }).length == 0;
    }
}


let evalRes = (res) => {
    const $ = cheerio.load(res, { xmlMode: true });
    const earthquakesDOM = getEarthquakesDOM($);
    const networkEarthquakes = createEarthquakesArray($, earthquakesDOM);
    readLocalFileEarthquakes().then(strLocalEarthquakes => {
            const localEarthquakes = JSON.parse(strLocalEarthquakes);
            const newEarthquakes = networkEarthquakes.filter(comparer(localEarthquakes));
            console.log('newEarthquakes', newEarthquakes);
            const earthquakes = getEarthquakesBySelectedCriteria(newEarthquakes);
            console.log('earthquakes', earthquakes);
            const smsText = createSmsText(earthquakes);
            writeEarthquakesToFile(networkEarthquakes);
            if (smsText.length === 0) {
                console.log('Earthquake not happened');
                return;
            }
            writeSmsToFile(smsText);
            sendSmsToRecievers(smsText);
        })
        .catch(err => console.log(err));
}

let getEarthquakesDOM = ($) => {
    return $('earhquake');
}

let createEarthquakesArray = ($, earthquakesDOM) => {
    let earthquakes = [];
    earthquakesDOM.each((index, earthquake) => {
        earthquakes.push(createEarthQuakeObj($, earthquake));
    });
    return earthquakes;
}

let createEarthQuakeObj = ($, earthquake) => {
    const date = $(earthquake).attr("name").trim();
    const location = $(earthquake).attr("lokasyon").replace(/\s\s+/g, ' ').trim();
    const lat = $(earthquake).attr("lat").trim();
    const lng = $(earthquake).attr("lng").trim();
    const mag = $(earthquake).attr("mag").trim();
    const depth = $(earthquake).attr("Depth").trim();
    return { date, location, lat, lng, mag, depth };
}

let writeEarthquakesToFile = (earthquakes) => {
    fs.writeFile('previousEarthquakes.json', JSON.stringify(earthquakes), function(err) {
        if (err) return console.log(err);
        console.log('Written earthquakes.json');
    });
}
const readFile = async filePath => {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return data;
    } catch (err) {
        console.log(err);
    }
}

let readLocalFileEarthquakes = () => {
    return readFile('previousEarthquakes.json');
}

const getEarthquakesBySelectedCriteria = newEarthquakes => {
    const foundEarthquakes = [];
    const districts = process.env.DISTRICTS_DELIMITED_WITH_SEMICOLON.split(';');
    const minMagnitude = process.env.MIN_MAGNITUDE;
    newEarthquakes.forEach(earthquake => {
        districts.forEach(district => {
            if (earthquake.location.includes(district) && earthquake.mag >= minMagnitude) {
                foundEarthquakes.push(earthquake);
            }
        });
    });
    return foundEarthquakes;
}

let createSmsText = (earthquakes) => {
    let smsTextArray = [];
    earthquakes.forEach(earthquake => {
        smsTextArray.push(createSmsLine(earthquake));
    });
    if (smsTextArray.length === 0) return "";
    return `${emptyChar}\n${emptyChar}\n${smsTextArray.join('\n')}\n${emptyChar}\n${emptyChar}`;
}


let createSmsLine = (earthquake) => {
    let date = earthquake.date;
    if (date.includes(' ')) {
        date = date.split(' ')[1];
    }
    return `💢 ${earthquake.mag} ${date} ${earthquake.location}`;
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