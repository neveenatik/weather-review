'use strict';

const fetch = require("node-fetch");
const sleep = require("sleep");
const geolib = require("geolib");
const config = require('./myConfig.json');
const baseURL = "https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2"; //setting base url with all static parameters
const downsample = 17; 
const coordinatesURL = `${baseURL}/geotype/multipoint.json?downsample=${downsample}`; //getting coordinates from the api
const polygonURL = `${baseURL}/geotype/polygon.json`;
const cityNameURL = "http://api.geonames.org/findNearbyPlaceNameJSON?";
const finalResults = [];

/** This is a description of the @async getWeatherData function
 * the api provides forecast information for 1665 cities in 
 * Sweden Finland Norway Estonia Latvia Lithuania Denmark north of Germany Poland The Netherlands
 * Belarus and Russia
 * this number can be more depending on @var downsample this variable allows an integer between 0-20. 
 * A downsample value of 2 means that every other value horizontally and vertically is displayed.
 * @param url the url of api for fetching the forecast data 
 * @param chunkSize {number} of coordinates to be used in one fetch request
 * @param pausing  {number} of seconds the application will take before making another fetch request
 * if value is not available {undefined} is provided as value
*/
const getWeatherData = async (url, chunkSize, pausing) => {
  try {
    // fetching polygon coordinates from the api (for future reliability in case coordinates changes);
    const responsePolygon = await fetch(polygonURL);
    errorHandler(responsePolygon, "responsePolygon", 1);
    const parsedPolygon = await responsePolygon.json();

    //structuring polygonBoundaries
    const polygonBoundaries = parsedPolygon.coordinates.map(coordinates => {
      return { latitude: coordinates[1], longitude: coordinates[0] };
    });
    //fetching cities coordinates from the api
    const responseCoordinates = await fetch(url);
    errorHandler(responseCoordinates, "responseCoordinates", 1);
    const coordinatesCities = await responseCoordinates.json();
    console.error(`fetching ${coordinatesCities.coordinates.length} cities`);
    
    //filtering coordinates that are inside the polygon
    const testedInBoundaries = coordinatesCities.coordinates.filter(city => {
      return geolib.isPointInside(
        { latitude: city[1], longitude: city[0] },
        polygonBoundaries
      );
    });

    //for loop to make fetch in chunks that can be assigend with passing chunkSize to the getWeatherData function
    for (let i = 0; i < testedInBoundaries.length; i += chunkSize) {
      console.error(`fetching from ${i} to ${i + chunkSize}`);
      const slicedCoordinates = testedInBoundaries.slice(i, i + chunkSize - 1); //slicing testedInBoundaries array to a chunckSize array

      //fetching forecast data and city name for the slicedCoordinates array
      const forecastResults = await Promise.all(
        slicedCoordinates.map(async (testedCoordinates, index) => {
          // pausing before making each fetch
          sleep.sleep(pausing); 
          const result = await fetch(`${baseURL}/geotype/point/lon/${Math.floor(testedCoordinates[0] * 1000000) / 1000000}/lat/${Math.floor(testedCoordinates[1] * 1000000) / 1000000}/data.json`);
          errorHandler(result, "response forecast result", i + index);
          // fetching city name based on nearest populated place from geoname api
          const fetchCityName = await fetch(`${cityNameURL}lat=${Math.floor(testedCoordinates[1] * 1000000) /1000000}&lng=${Math.floor(testedCoordinates[0] * 1000000) /1000000}&username=${config.username}`);
          errorHandler(fetchCityName, "response cityName", i + index);
          //parsing coordinates and fetched forecast from JSON
          const cityName = await fetchCityName.json();
          const parsedResult = await result.json();
          //validating response
          if (cityName.geonames !== undefined && cityName.geonames.length > 0 && parsedResult.geometry.coordinates !== undefined) {
            return [parsedResult, cityName];
          }
          console.error(`city name not found for lat:${testedCoordinates[1]}, lng ${testedCoordinates[0]}`);
          //return undefined values when response is not found
          if (cityName.geonames === undefined && parsedResult.geometry.coordinates !== undefined) {
            return [
              parsedResult, 
              { geonames: [{ name: undefined, countryName: undefined }] }
            ]
          }
            return [
              {
              approvedTime: undefined,
              referenceTime: undefined,
              geometry: {
                type: undefined,
                coordinates: [
                  [
                    undefined,
                    undefined
                  ]
                ]
              },
              timeSeries: [
                {
                  validTime: undefined,
                  parameters: [
                    {
                      name: undefined,
                      levelType: undefined,
                      level: undefined,
                      values: [
                        undefined
                      ]
                    }
                  ]
                }
              ]
            },
            { geonames: [{ name: undefined, countryName: undefined }] }
          ];
        })
      );
      //structuring the result in the favored output format
      const results = forecastResults.map(forecast => {
        return {
          location: {
            lng: forecast[0].geometry.coordinates[0][0],
            lat: forecast[0].geometry.coordinates[0][1],
            cityName: forecast[1].geonames[0].toponymName,
            countryName: forecast[1].geonames[0].countryName
          },
          weather: forecast[0].timeSeries.map(result => {
            return {
              fromHour: Date.parse(result.validTime)/1000 || undefined,
              toHour: Date.parse(result.validTime) / 1000 + 3600,
              updatedTimestamp: Date.parse(forecast[0].referenceTime) / 1000 || undefined,
              temperatureC: extractParameter(result, "t"),
              pressureHPA: extractParameter(result, "msl"),
              humidityPercent: extractParameter(result, "r"),
              windDirectionDeg: extractParameter(result, "wd"),
              windSpeedMps: extractParameter(result, "ws"),
              windGustMps: extractParameter(result, 'gust'),
              cloudinessPercent: extractParameter(result, "tcc_mean"),
              lowCloudsPercent: extractParameter(result, "lcc_mean"),
              mediumCloudsPercent: extractParameter(result, "mcc_mean"),
              highCloudsPercent: extractParameter(result, "hcc_mean"),
              symbol: extractParameter(result, "Wsymb2")
            };
          })
        };
      });
      // filtering undefined results
      results.forEach(result => {
        if (result.location.lng !== undefined){
          finalResults.push(result);
          console.error(result);
        }
      });
    }
    console.log(JSON.stringify(finalResults, null, 2));
  } catch (error) {
    console.error(error);
  }
}
/** this is a description of errorHandler function
 * @param response {object} fetched data
 * @param dataName {string} the name of fetched data to keep track of the fetch process
 * @param number {number} index that keeps track of the fetched data
 */
const errorHandler = (response, dataName, number) => {
  if (response.status !== 200) {
    console.error( `Error: ${response.status} - ${response.statusText} fetching ${dataName}` );
    return undefined;
  }
  console.error(`Success ${dataName} ${number}`);
};

/**this is a description of extractPrameter function
 * @param result {object}
 * @param param {string} the parameter in the response provided from the api
 */
const extractParameter = (result, param) => {
  if (result.parameters.length > 0) {
    for (let i = 0; i < result.parameters.length; i++) {
      if (result.parameters[i].name === param) {
      if (param === "tcc_mean" || param === "lcc_mean" || param === "mcc_mean" || param === "hcc_mean") {
        //converting octas to percentage
        result.parameters[i].values[0] = result.parameters[i].values[0] * 12.5;
      } else if (param === "Wsymb2") {
        switch (result.parameters[i].values[0]) {
          case 1:
            result.parameters[i].values[0] = 1;
            break;
          case 2:
            result.parameters[i].values[0] = 2;
            break;
          case 3:
            result.parameters[i].values[0] = "Variable cloudiness";
            break;
          case 4:
            result.parameters[i].values[0] = "Halfclear sky";
            break;
          case 5:
            result.parameters[i].values[0] = "Cloudy sky";
            break;
          case 6:
            result.parameters[i].values[0] = "Overcast";
            break;
          case 7:
            result.parameters[i].values[0] = "Fog";
            break;
          case 8:
            result.parameters[i].values[0] = "Light rain showers";
            break;
          case 9:
            result.parameters[i].values[0] = "Moderate rain showers";
            break;
          case 10:
            result.parameters[i].values[0] = "Heavy rain showers";
            break;
          case 11:
            result.parameters[i].values[0] = "Thunderstorm";
            break;
          case 12:
            result.parameters[i].values[0] = "Light sleet showers";
            break;
          case 13:
            result.parameters[i].values[0] = "Moderate sleet showers";
            break;
          case 14:
            result.parameters[i].values[0] = "Heavy sleet showers";
            break;
          case 15:
            result.parameters[i].values[0] = "Light snow showers";
            break;
          case 16:
            result.parameters[i].values[0] = "Moderate snow showers";
            break;
          case 17:
            result.parameters[i].values[0] = "Heavy snow showers";
            break;
          case 18:
            result.parameters[i].values[0] = "Light rain";
            break;
          case 19:
            result.parameters[i].values[0] = "Moderate rain";
            break;
          case 20:
            result.parameters[i].values[0] = "Heavy rain";
            break;
          case 21:
            result.parameters[i].values[0] = "Thunder";
            break;
          case 22:
            result.parameters[i].values[0] = "Light sleet";
            break;
          case 23:
            result.parameters[i].values[0] = "Moderate sleet";
            break;
          case 24:
            result.parameters[i].values[0] = "Heavy sleet";
            break;
          case 25:
            result.parameters[i].values[0] = "Light snowfall";
            break;
          case 26:
            result.parameters[i].values[0] = "Moderate snowfall";
            break;
          case 27:
            result.parameters[i].values[0] = "Heavy snowfall";
            break;
        }
      }
      return result.parameters[i].values[0];
    }
  }
}
return undefined;
}

getWeatherData(coordinatesURL, 5, 2);
