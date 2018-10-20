'use strict';
const weatherSymbols = {
  sun: 0,
  rain: 1,
  cloud: 2,
  fog: 3,
  snow: 4
}

export default function translateSymbol(symbol){
    if (symbol) {
        for ( let i = 0; i < Object.keys(weatherSymbols); i++) {
            if (RegExp(Object.keys(weatherSymbols)[i], 'i').test(symbol)) {
                return weatherSymbols[Object.keys[i]];
            }
        }
    }
}