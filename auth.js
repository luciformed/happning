"use strict";


const log = console.log.bind(console);

let R = require('ramda');
let happnApi = require('./happn.js');
let storage = require('node-persist');
storage.initSync();

let happn = new happnApi();

happn.auth()
// .then(log).catch(log);


// process.exit(0);
