/**
 * Formatters and helpers for company data in template.
 */

const _ = require('lodash');
const moment = require('moment');

// Currency formatter
let currency = new Intl.NumberFormat({ currency: 'USD' }).format;

// Round
let round = (value, decimals = 2) => {
  return _.isNumber(value)
    ? Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
    : value;
};

// Get value given set and year
let getValue = (set, name, year) => {
  return _.isObject(set) && _.isObject(set[year]) && set[year][name]
    ? set[year][name]
    : '';
};

// Get change for a value
let getChange = (set, name, publishYear, decimals = 2, formatted = true) => {
  formatted = formatted === 'false' ? false : !!formatted;
  let round = value => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };
  let c =
    _.isObject(set) && _.isObject(set[publishYear]) && set[publishYear][name]
      ? set[publishYear][name]
      : undefined;
  let p =
    _.isObject(set) &&
    _.isObject(set[publishYear - 1]) &&
    set[publishYear - 1][name]
      ? set[publishYear - 1][name]
      : undefined;
  if (_.isNumber(c) && _.isNumber(p)) {
    return formatted ? round((c - p) / p * 100, decimals) + '%' : (c - p) / p;
  }
  else {
    return formatted ? '-' : undefined;
  }
};

// Format date
let formatDate = (date, format) => {
  //return window.moment(date).format(format);
  return moment && date
    ? moment(date).format(format)
    : date && date.toLocaleString ? date.toLocaleString().split('T')[0] : '';
};

// https://stackoverflow.com/questions/10599933/convert-long-number-into-abbreviated-string-in-javascript-with-a-special-shortn
let abbreviateNumber = (input, decimals = 1) => {
  if (!_.isNumber(input)) {
    return input ? input : '';
  }

  // Round function
  let round = value => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  // Get power
  let b = input.toPrecision(2).split('e');
  // Floor at decimals, ceiling at trillions
  let k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3);
  // Divide by power
  let c = k < 1 ? round(input) : round(input / Math.pow(10, k * 3));
  // Ensure -0 is 0
  c = c < 0 ? c : Math.abs(c);
  // Append abbreviation
  return c + ['', 'k', 'M', 'B', 'T'][k];
};

// Officer name
let officerName = (officers, publishYear) => {
  // Don't show Mr, Mr, Ms, Mrs salut
  return _.isObject(officers) && _.isObject(officers[publishYear])
    ? (officers[publishYear].salut &&
      officers[publishYear].salut.indexOf('M') !== 0
      ? officers[publishYear].salut + ' '
      : '') +
        officers[publishYear].first +
        ' ' +
        officers[publishYear].last +
        (officers[publishYear].lineage
          ? ', ' + officers[publishYear].lineage
          : '')
    : '';
};

// Link url from field
let linkURL = www => {
  return www && www.indexOf('http') === 0 ? www : 'http://' + www;
};

// Link text from url field
let linkText = www => {
  return www
    ? www
      .replace(/https?:\/\//, '')
      .replace('www.', '')
      .replace(/\/$/, '')
    : '';
};

module.exports = {
  currency,
  round,
  getValue,
  getChange,
  formatDate,
  abbreviateNumber,
  officerName,
  linkURL,
  linkText
};
