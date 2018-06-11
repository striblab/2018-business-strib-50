/**
 * Transform company data coming Data UI
 */

// Dependencies
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');

// Main transform
module.exports = (input, options) => {
  let y = options.publishYear;

  // Find CEO
  let parsed = _.map(input.objects, c => {
    if (!c.officers || !c.officers.length) {
      c.noCEO = true;
      c.ceo = {};
      return c;
    }

    // Look for title in salary row
    let ceo = _.find(c.officers, o => {
      return _.find(o.salaries, s => {
        return s.publishyear === y && s.title && s.title.match(/ceo/i);
      });
    });

    if (ceo) {
      ceo.salaries = _.keyBy(ceo.salaries, 'publishyear');
      c.ceo = ceo;
    }
    else {
      c.noCEO = true;
      c.ceo = {};
    }

    return c;
  });

  // Key by year
  parsed = _.map(parsed, c => {
    c.employees = _.keyBy(c.employees, 'publishyear');
    c.finances = _.keyBy(c.finances, 'publishyear');
    return c;
  });

  // Ranks for last five year
  _.each(_.range(5), r => {
    let cY = y - r;

    // Create list of revenues.  Technically, a revenue could be
    // duplicated, and therefore a rank could be duplicated.
    let revenues = _
      .sortBy(
        _.uniq(
          _.map(_.filter(parsed, p => {
            // Make any exceptions here.

            // "Winnebago" moved to MN in 2018, so it technically didn't have
            // a rank in prior years
            // TODO: Figure out a way to represent in database
            if (cY <= 2017 && p.coid === '99706') {
              return false;
            }

            return true;
          }), c => {
            return c.finances[cY] ? c.finances[cY].revenue : null;
          })
        ),
        c => {
          return c ? c : -1;
        }
      )
      .reverse();

    // Match revenues
    parsed = _.map(parsed, p => {
      p.ranks = p.ranks || {};
      let i = _.findIndex(
        revenues,
        r => (p.finances[cY] ? r === p.finances[cY].revenue : r === null)
      );
      p.ranks[cY] = i >= 0 ? i + 1 : null;
      return p;
    });
  });

  // Check for logo
  parsed = _.map(parsed, p => {
    p.hasLogo = fs.existsSync(path.join(options.logos, p.coid + '.png'));
    return p;
  });

  // Sort by current rank
  parsed = _.sortBy(parsed, p => p.ranks[y]);

  return parsed;
};
