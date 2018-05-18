/**
 * Import some data from a Google spreadsheet
 */

// Just in case
process.on('unhandledRejection', r => console.error(r));

// Dependencies
const fs = require('fs-extra');
const path = require('path');
const util = require('util');
const _ = require('lodash');
const mysql = require('mysql');
const moment = require('moment');
const Sheets = require('../../lib/content-sheets.js');
const argv = require('yargs').argv;
require('dotenv').load();

// Settings
const listYear = new Date().getFullYear();
const fileDate =
  '' +
  new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');
const sqlDate = '' + new Date().toISOString().slice(0, 10);
// const sqlDateTime =
//   '' +
//   new Date()
//     .toISOString()
//     .slice(0, 19)
//     .replace(/T/g, ' ');
const defaultFiscalYearEnd = listYear - 1 + '-12-31';

// Make sure we have credentials
if (
  !process.env.MYSQL_HOST ||
  !process.env.MYSQL_USER ||
  !process.env.MYSQL_DATABASE
) {
  throw new Error(
    'Make sure the following environment variables are set: MYSQL_USER, MYSQL_HOST, MYSQL_DATABASE || MYSQL_PASS is optional.'
  );
}

// Make sure we have a sheet load
if (!process.env.IMPORT_SHEETS_ID) {
  throw new Error('Environment variable IMPORT_SHEETS_ID is not available.');
}

// Make sure build is created
fs.mkdirpSync(path.join(__dirname, '..', 'build'));

// Connect
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS || '',
  database: process.env.MYSQL_DATABASE
});
db.connect();
db.queryP = util.promisify(db.query).bind(db);

// Main function
async function main() {
  // Get current data
  let current = await currentData();

  // Get responses
  let s = new Sheets({
    permissions: ['https://www.googleapis.com/auth/spreadsheets']
  });
  let responses = s.formatRawGrid(
    await s.getRawGrid(process.env.IMPORT_SHEETS_ID, false, 'formattedValue')
  );

  // check we have data
  if (!responses) {
    throw new Error('No data found in sheet: ' + process.env.IMPORT_SHEETS_ID);
  }

  // Clean up
  responses = _.filter(responses, r => {
    return (
      r['Symbol'] && !~['test org', 'test'].indexOf(r['Name'].toLowerCase())
    );
  });

  // Match up symbol
  responses = _.map(responses, r => {
    // Create more standard symbol
    r.simpleSymbol = r.Symbol.split('.')[0];

    // Look up
    let f = _.find(current.companies, { StockSymbol: r.simpleSymbol });
    if (f) {
      r.COID = f.COID;
    }
    else {
      console.error(`Unable to find symbol: ${r.simpleSymbol}`);
    }

    return r;
  });

  // Map data to SQL tables and fields
  let parsed = _.map(responses, r => {
    // Make sure we have an existing COID
    let companyLookup = _.find(current.companies, {
      COID: r.COID
    });
    if (!companyLookup) {
      console.error(r);
      throw new Error('Unable to find COID in table.');
    }

    // Company
    let company = {
      COID: r.COID,
      Added: companyLookup.Added ? companyLookup.Added : sqlDate,
      created_date: companyLookup.created_date
        ? companyLookup.created_date
        : sqlDate,
      modified_date: sqlDate
    };

    // Employees
    // let employeesLookup = _.find(current.employees, e => {
    //   return (
    //     e.COID === r['Star Tribune ID'] &&
    //     e.PublishYear &&
    //     e.PublishYear === listYear
    //   );
    // });
    // let employees = {
    //   ID: null,
    //   COID: r['Star Tribune ID'],
    //   Added: sqlDate,
    //   PublishYear: listYear,
    //   Total: parseNumber(r['Total number of employees'])
    // };
    // if (employeesLookup) {
    //   employees.ID = employeesLookup.ID;
    //   employees.Added = employeesLookup.Added
    //     ? employeesLookup.Added
    //     : employees.Added;
    // }

    // Officer, make sure there is at least a last name
    // let officer;
    // let salary;
    // if (r['Last Name'] && (r['Salary'] || r['Total compensation'])) {
    //   let officerLookup = _.find(current.officers, e => {
    //     return e.COID === r['Star Tribune ID'] && e.Last === r['Last Name'];
    //   });
    //   officer = {
    //     ID: null,
    //     COID: r['Star Tribune ID'],
    //     First: r['First Name'],
    //     Last: r['Last Name'],
    //     Title: r['Title']
    //   };
    //   if (officerLookup) {
    //     officer.ID = officerLookup.ID;
    //   }

    //   // NP Officer salary.
    //   // TODO: Currently not doing logic to handle adding an officer and
    //   // salary, so an error will pop up when adding the salary,
    //   // as there is no OfficerID.  But, the next time the import runs,
    //   // it should work fine.
    //   let salaryLookup = _.find(current.salaries, e => {
    //     return (
    //       officerLookup &&
    //       officerLookup.ID === e.OfficerID &&
    //       e.PublishYear &&
    //       e.PublishYear === listYear
    //     );
    //   });
    //   salary = {
    //     ID: null,
    //     OfficerID: null,
    //     Added: sqlDate,
    //     PublishYear: listYear,
    //     FiscalYearEnd: inputToSQLDate(r['Date of these data']),
    //     Salary: parseNumber(r['Salary']),
    //     Bonus: parseNumber(r['Bonus']),
    //     Other: parseNumber(r['Other compensation']),
    //     Deferred: parseNumber(r['Deferred compensation']),
    //     Benefit: parseNumber(r['Value of benefits']),
    //     Total: parseNumber(r['Total compensation'])
    //   };
    //   if (salaryLookup) {
    //     salary.ID = salaryLookup.ID;
    //     salary.OfficerID = officerLookup.ID;
    //     salary.Added = salaryLookup.Added ? salaryLookup.Added : salary.Added;
    //   }
    //   else if (officerLookup) {
    //     salary.OfficerID = officerLookup.ID;
    //   }
    // }
    // else {
    //   console.error(
    //     'No officer for ',
    //     r['Star Tribune ID'],
    //     r['Organization Name']
    //   );
    // }

    // Finances
    let financesLookup = _.find(current.finances, e => {
      return e.COID === r.COID && e.PublishYear === listYear;
    });
    let finances = {
      ID: null,
      COID: r.COID,
      //Added: sqlDate,
      PublishYear: listYear,
      FYE: inputToSQLDate(r['Period']) || defaultFiscalYearEnd,
      MaxOfFYE: inputToSQLDate(r['Period']) || defaultFiscalYearEnd,
      //Source: 'Import from spreadsheet',
      Revenue: parseNumber(r['Total Revenue FY2017'], 'float', 1000000),
      PrevYearRevenue: parseNumber(
        r['Total Revenue FY2016'],
        undefined,
        1000000
      ),
      NetIncome: parseNumber(r['Net Income FY2017'], 'float', 1000000),
      PrevYearNetIncome: parseNumber(
        r['Net Income FY2016'],
        undefined,
        1000000
      ),
      TotalAssets: parseNumber(r['Total Assets FY2017'], 'float', 1000000),
      PrevYearTotalAssets: parseNumber(
        r['Total Assets FY2016'],
        undefined,
        1000000
      ),
      MarketCap: parseNumber(
        r['Total Market Capitalization FY2017'],
        undefined,
        1000000
      ),
      PrevYearMarketCap: parseNumber(
        r['Total Market Capitalization FY2016'],
        undefined,
        1000000
      ),
      NetIncomeBeforeExtra: parseNumber(
        r['Net Income Before Extraordinary Items FY2017'],
        'float',
        1000000
      ),
      PrevYearNetIncomeBE: parseNumber(
        r['Net Income Before Extraordinary Items FY2016'],
        'float',
        1000000
      ),
      Footnotes: r.Footnotes
        ? r.Footnotes
        : financesLookup && financesLookup.Foornotes
          ? financesLookup.Foornotes
          : undefined,
      Notes: r['Internal notes'],
      created_date:
        financesLookup && financesLookup.created_date
          ? financesLookup.created_date
          : sqlDate,
      modified_date: sqlDate
    };
    if (financesLookup) {
      finances.ID = financesLookup.ID;
      finances.Added = financesLookup.Added
        ? financesLookup.Added
        : finances.Added;
    }

    return {
      company: company,
      //employees: employees,
      //officer: officer,
      //salary: salary,
      finances: finances
    };
  });

  // Make SQL statements
  let statements = ['BEGIN'];
  _.each(parsed, set => {
    _.each(set, (data, table) => {
      // Remove undefined
      _.each(data, (v, k) => {
        if (_.isUndefined(v)) {
          delete data[k];
        }
      });

      // Table name
      let tableName = {
        company: 'Companies',
        employees: 'Employees',
        officer: 'Officers',
        salary: 'Officer_Salaries',
        finances: 'Finances'
      }[table];

      // Make query
      if (_.size(data)) {
        let query = mysql.format(
          'INSERT INTO ' +
            tableName +
            ' (' +
            _.map(data, (v, k) => {
              return k;
            }).join(', ') +
            ') VALUES (' +
            _.map(data, () => {
              return '?';
            }).join(', ') +
            ') ON DUPLICATE KEY UPDATE ' +
            _.map(data, (v, k) => {
              return k + ' = ?';
            }).join(', '),
          _.map(data).concat(_.map(data))
        );

        statements.push(query);
      }
    });
  });
  statements.push('COMMIT');

  fs.writeFileSync(
    path.join(__dirname, '..', 'build', 'data-import-' + fileDate + '.sql'),
    statements.join('; \n\n')
  );
  console.error('Wrote SQL file out.');

  // Disconnext
  db.end();
}

// Go
main();

// Parse number
function parseNumber(input, type = 'int', multiplier = 1) {
  if (_.isNumber(input)) {
    return input;
  }
  else if (!_.isString(input)) {
    return undefined;
  }

  input = input.replace(/[^0-9-.]/g, '').trim();
  let parsed = type === 'int' ? parseInt(input, 10) : parseFloat(input);
  return multiplier ? parsed * multiplier : parsed;
}

// Parse MM/DD/YYYY date to YYYY-MM-DD
function inputToSQLDate(input) {
  if (input && moment(input, 'MM/DD/YYYY').isValid()) {
    return moment(input, 'MM/DD/YYYY').format('YYYY-MM-DD');
  }
}

// Get all current data
async function currentData() {
  let data = {};
  data.companies = await db.queryP('SELECT * FROM Companies');
  data.officers = await db.queryP('SELECT * FROM Officers');
  data.salaries = await db.queryP('SELECT * FROM Officer_Salaries');
  data.finances = await db.queryP('SELECT * FROM Finances');
  data.employees = await db.queryP('SELECT * FROM Employees');

  _.each(data, (d, set) => {
    fs.writeFileSync(
      path.join(
        __dirname,
        '..',
        'build',
        'non-profit-backup-' + fileDate + '-' + set + '.json'
      ),
      JSON.stringify(d)
    );
  });

  return data;
}
