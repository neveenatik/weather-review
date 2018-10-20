'use strict';
const weatherSymbols = {
  sun: 0,
  rain: 1,
  cloud: 2,
  fog: 3,
  snow: 4
}

function translateSymbol(symbol){
    if (symbol) {
        console.log('TCL: translateSymbol -> symbol', symbol);
        for ( let i = 0; i < Object.keys(weatherSymbols); i++) {
            console.log('TCL: translateSymbol -> Object.keys(weatherSymbols)', Object.keys(weatherSymbols));
            if (RegExp(Object.keys(weatherSymbols)[i], 'i').test(symbol)) {
                return weatherSymbols[Object.keys[i]];
            }
        }
    }
}

module.exports = {translateSymbol};