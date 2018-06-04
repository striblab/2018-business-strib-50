/**
 * Main JS file for project.
 */

// Define globals that are added through the config.json file, here like this:
/* global $ */
'use strict';

// Dependencies
import utilsFn from './utils.js';

// Import local ES6 modules like this:
//import utilsFn from './utils.js';

// Or import libraries installed with npm like this:
// import module from 'module';

// Setup utils function
utilsFn({});

// Filter buttons
$('#filter-category button').on('click', e => {
  let $this = $(e.currentTarget);
  let filter = $this.data('value');

  // Class
  $('#filter-category button').removeClass('active');
  $this.addClass('active');

  // Hide
  if (filter) {
    $(`.company:not([data-category="${filter}"])`).slideUp('fast');
    $(`.company[data-category="${filter}"]`).slideDown('fast');
  }
  else {
    $('.company').slideDown('fast');
  }
});
