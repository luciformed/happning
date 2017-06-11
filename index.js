"use strict";

// --harmony_default_parameters
// --harmony_destructuring

const log = console.log.bind(console);

const R = require("ramda");
const argv = require("yargs").argv;
const moment = require("moment");

const firebase = require("firebase");
const firebaseConfig = require("./config/firebase.json");

const app = firebase.initializeApp(firebaseConfig);
const db = app.database();

const { filter, map, pluck, propEq, all, prop } = R;

const happnConfig = require("./config/happn.json");

const happnApi = require("./happn.js");

const happn = new happnApi(happnConfig);

const inDateRange = date => {
  return moment(date).isAfter(moment().subtract(argv.days, "days"));
};

let step = 16, offset = 0, limit = 16, liked = 0;

const nextPage = offset => {
  return happn
    .getNotifications({
      limit,
      offset
    })
    .then(resp => {
      if (resp.success) {
        // log('happn success');
      }

      let data = resp.data;

      return data;
    })
    .catch(response => {
      log({
        response
      });
      log("data", response.error.data);
      process.exit(1);
    });
};

const persistData = data => {
  data = data || [];
  filter(prop("id"), data).forEach(d => {
    db.ref(`crossed-path/${d.id}`).set(d);
  });
  return data;
};

const likeDemAll = () => {
  nextPage(offset)
    .then(persistData)
    .then(data => {
      let notificationDates = map(n => new Date(n.modification_date), data);

      let females = pluck("notifier", data);

      let notYetLiked = filter(propEq("my_relation", 0), females);

      females.forEach(f => {
        let { fb_id, first_name, age } = f;
        log(`${first_name}, ${age}, ${fb_id}`);
      });

      return Promise.all(
        map(fem => {
          return happn.accept(fem.id).then(resp => {
            // log({resp});
            liked += 1;

            // log(`LIKED: ${first_name}, ${age}, ${fb_id}`);
          });
        }, notYetLiked)
      ).then(() => {
        if (all(inDateRange, notificationDates)) {
          return Promise.resolve();
        } else {
          return Promise.reject();
        }
      });
    })
    .then(() => {
      offset += step;
      likeDemAll();
    })
    .catch(e => {
      if (e) {
        log({ e });
      } else {
        log(`that's it for today, total headcount is ${liked}`);
        process.exit(0);
      }
    });
};

// log(argv.days);
happn.auth().then(likeDemAll);

// db.ref("crossed-path").once("value").then(snapshot => {
//     let count = snapshot.numChildren();
//     log("firebase db count", { count });
//   });
