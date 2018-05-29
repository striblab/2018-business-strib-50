/**
 * Output for print.
 */

const fs = require('fs-extra');
const path = require('path');
const csv = require('d3-dsv').dsvFormat(',');
const _ = require('lodash');
const helpers = require('./company-helpers.js');

// Where to output
const outputDir = path.join(__dirname, '..', 'data', 'build');
fs.mkdirpSync(outputDir);

// Processing function
module.exports = data => {
  let y = data.publishYear;
  let rows = [];
  let now = new Date();
  let outputFile = path.join(outputDir, `${now.toISOString()}-strib-50.csv`);

  // // Sort
  // data.companies = _.sortBy(data.companies, c => {
  //   return c.rank &&
  // })

  _.take(data.companies, 50).forEach(c => {
    let row = {
      rank: c.ranks[y],
      company: c.name,
      stockSymbol: c.stocksymbol
    };

    // Revenue
    row.revenue = helpers.getValue(c.finances, 'revenue', y);
    row.previousRevenue = helpers.getValue(c.finances, 'revenue', y - 1);
    row.revenueChangePercent =
      (row.revenue - row.previousRevenue) / row.previousRevenue * 100;

    // Income
    row.income = helpers.getValue(c.finances, 'netincomebeforeextra', y);
    row.previousIncome = helpers.getValue(
      c.finances,
      'netincomebeforeextra',
      y - 1
    );
    row.incomeChangePercent =
      (row.income - row.previousIncome) / row.previousIncome * 100;

    // Assets
    row.assets = helpers.getValue(c.finances, 'totalassets', y);
    row.previousAssets = helpers.getValue(c.finances, 'totalassets', y - 1);
    row.assetsChangePercent =
      (row.assets - row.previousAssets) / row.previousAssets * 100;

    // Market cap
    row.marketcap = helpers.getValue(c.finances, 'marketcap', y);
    row.previousMarketcap = helpers.getValue(c.finances, 'marketcap', y - 1);
    row.marketcapChangePercent =
      (row.marketcap - row.previousMarketcap) / row.previousMarketcap * 100;

    // Employees
    // row.employees = helpers.getValue(c.employees, 'total', y);
    // row.previousEmployees = helpers.getValue(c.employees, 'total', y - 1);
    // row.employeesChangePercent =
    //   (row.employees - row.previousEmployees) / row.previousEmployees * 100;

    // Footnotes
    row.footnotes = _.filter([
      c.footnotes,
      helpers.getValue(c.finances, 'footnotes', y)
    ]).join('  ');

    rows.push(row);
  });

  fs.writeFileSync(outputFile, csv.format(rows));
};
