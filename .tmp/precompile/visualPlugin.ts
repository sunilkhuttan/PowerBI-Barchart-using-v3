import { Visual } from "../../src/visual";
var powerbiKey = "powerbi";
var powerbi = window[powerbiKey];

var barChart73C65A9EFC054E209C5AD2590D7D227E_DEBUG = {
    name: 'barChart73C65A9EFC054E209C5AD2590D7D227E_DEBUG',
    displayName: 'BarChart',
    class: 'Visual',
    version: '1.0.0',
    apiVersion: '2.6.0',
    create: (options) => {
        if (Visual) {
            return new Visual(options);
        }

        console.error('Visual instance not found');
    },
    custom: true
};

if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["barChart73C65A9EFC054E209C5AD2590D7D227E_DEBUG"] = barChart73C65A9EFC054E209C5AD2590D7D227E_DEBUG;
}

export default barChart73C65A9EFC054E209C5AD2590D7D227E_DEBUG;