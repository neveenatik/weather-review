const cheerio = require('cheerio');
const axios = require('axios');
const coords = require('../data.json');
const world = 'http://www.meteo.be/meteo/view/en/123352-World.html';
const wind = require('windrose');

async function main() {
    try {
        const res = await axios.get(world);
        const object = cheerio.load(res.data);

        const cities = object('table .side_th')
            .toArray()
            .map(city => city.children[0].data)
            .map(city => {
                const getCities = coords.find(elem => elem.name === city);
                if (!getCities) return;
                return {
                    name: city,
                    lat: getCities.lat,
                    lng: getCities.lng
                };
            })
        cities.splice(0, 2);

        const data = object('tbody > tr')
            .toArray()
            .map(row => row.children
                .filter(cell => cell.name === 'td' && cell.type === 'tag')
                .map(td => td.children[0] && td.children[0].data));

        data.splice(0, 2);
        data.forEach(elem => elem.shift());
        data.forEach(arr => {
            arr[4] = (arr[4] * 0.277777778).toFixed(2);
        });
        let time = object('.table')
            .children('h3')
            .text()
            .replace("Observations  ", "")
            .replace(",", "")
            .replace("(", "")
            .replace(" h)", ":00 UTC");
        let date = Date.parse(time) / 1000;

        const objects = data.map(arr => {
            let degree = wind.getDegrees(arr[3])
            if (degree !== undefined) {
                let object = []
                for (i = 0; i < 10800; i = i + 3600) {
                    object.push({
                        updatedTimestamp: date,
                        fromHour: date + i,
                        toHour: date + 3600 + i,
                        temperatureC: parseFloat(arr[0]),
                        humidityPercent: parseFloat(arr[1]),
                        pressureHPA: parseFloat(arr[2]),
                        windDirectionDeg: degree.value,
                        windSpeedMps: parseFloat(arr[4]),
                        symbol: arr[5]
                    })
                };
                return object
            }
            else {
                let object = []
                for (i = 0; i < 10800; i = i + 3600) {
                    object.push({
                        updatedTimestamp: date,
                        fromHour: date + i,
                        toHour: date + 3600 + i,
                        temperatureC: parseFloat(arr[0]),
                        humidityPercent: parseFloat(arr[1]),
                        pressureHPA: parseFloat(arr[2]),
                        windSpeedMps: parseFloat(arr[4]),
                        symbol: arr[5]
                    })
                };
                return object
            }
        });

        const array = [];
        for (i = 0; i < data.length; i++) {
            const obj = {
                location: cities[i],
                weather: objects[i]
            }
            array.push(obj)
        }

        console.log(JSON.stringify(array, null, 2));
    } catch (error) {
        console.log(error)
    }
}
main()