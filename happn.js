"use strict";

const storage = require("node-persist");

storage.initSync();

const request = require("request-promise");
const querystring = require("querystring");
const R = require("ramda");

const { merge, mergeAll } = R;

const fb_access_token = storage.getItem("fb_access_token");
const auth_token = storage.getItem("auth_token");
const refresh_token = storage.getItem("refresh_token");

const log = console.log.bind(console);

const baseURL = "https://api.happn.fr/api";

/*const my_relation = {
  0: 'none',
  1: 'liked',
  2: 'rejected',
  4: '??? both likes'
}
*/
const NOTIFICATION_TYPES = {
  NEAR_YOU: 468,
  POKED_YOU: 471
};

const requestDefaults = {
  json: true
  // useQueryString: true
  // resolveWithFullResponse: true,
};

class HappnApi {
  constructor(config) {
    this.config = config;

    this._userId = config.myUserId;

    this._headers = {
      "Content-Type": "application/json",
      "User-Agent": "Happn/18.5.0 AndroidSDK/22",
      "Accept-Language": "en-GB;q=1,en;q=0.75",
      "X-Happn-DID": config.deviceId,
      Authorization: `OAuth="${auth_token}"`
    };
  }

  callApi(options) {
    return request(
      mergeAll([
        requestDefaults,
        options,
        {
          headers: this._headers
        }
      ])
    );
  }

  auth() {
    const { client_secret, client_id, scope, deviceId } = this.config;

    return request({
      method: "POST",
      form: {
        client_id,
        client_secret,
        scope,
        grant_type: "assertion",
        assertion_type: "facebook_access_token",
        assertion: fb_access_token
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Happn/18.5.0 AndroidSDK/22",
        "Accept-Language": "en-GB;q=1,en;q=0.75",
        "X-Happn-DID": deviceId
      },
      uri: `https://api.happn.fr/connect/oauth/token/`,
      json: true
    }).then(data => {
      storage.setItemSync("access_token", data.access_token);

      this._headers = merge(this._headers, {
        Authorization: `OAuth="${data.access_token}"`
      });
      return data;
    });
  }

  accept(id) {
    return this.callApi({
      method: "POST",
      body: {},
      uri: `${baseURL}/users/${this._userId}/accepted/${id}`
    });
  }

  getNotifications(options) {
    return this.callApi({
      method: "GET",
      qs: {
        types: NOTIFICATION_TYPES.NEAR_YOU,
        offset: options.offset || 0,
        limit: options.limit || 16,
        fields: [
          "id",
          "modification_date",
          "notification_type",
          "nb_times",
          "notifier.fields(id,job,is_accepted,workplace,my_relation,distance,gender,is_charmed,nb_photos,first_name,age,profiles.mode(1).width(360).height(640).fields(width,height,mode,url))"
        ].join(",")
      },
      uri: `${baseURL}/users/${this._userId}/notifications`
    });
  }
}

module.exports = HappnApi;
