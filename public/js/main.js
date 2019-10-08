// Get sesssion data from localStorage
var LOCAL_STORAGE_KEY = 'bp_session';
var sessionData = window.localStorage.getItem(LOCAL_STORAGE_KEY);
sessionData = sessionData
  ? JSON.parse(sessionData)
  : { submissions: 0, email: false };

/*
 * Check session
 *
 * - Only allow 3 email checks before asking for email
 */

let FOUND_ADDRESSES = [];

function checkSession() {
  setTimeout(function() {
    if (!sessionData.email && sessionData.submissions >= 3) {
      $('#modal1').modal('open');
    }
  }, 2000);
}

/*
 * On email modal submit handler
 */
function onEmailSubmit(e) {
  e.preventDefault();

  // Get data from form
  var data = buildData(e.target);

  if (!validate(data)) {
    return;
  }

  // Disable form
  $('#email-capture input').attr('disabled', true);
  $('#email-capture button').attr('disabled', true);

  // $('#result').html;
  data.type = 'Email Finder';

  $.ajax({
    url: 'https://7umdo22ge3.execute-api.us-west-2.amazonaws.com/dev/email',
    method: 'POST',
    data: JSON.stringify(data),
    timeout: 20000,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json'
  })
    .done(function(data) {
      $('#email-capture input').attr('disabled', false);
      $('#email-capture button').attr('disabled', false);

      // Set that email has been submitted
      sessionData.email = true;

      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(sessionData)
      );

      $('#modal1').modal('close');
    })
    .fail(function(err) {
      $('#email-capture input').attr('disabled', false);
      $('#email-capture button').attr('disabled', false);
    });

  return false;
}

function onSingleSearch() {
  console.log('singleSearch clicked ');
  $('#multiple-search-div').hide();
  $('#email-form').show();
}

function onMultipleSearch() {
  console.log('MultipleSearch clicked ');
  $('#email-form').hide();
  $('#multiple-search-div').show();
}

function generateExcelFile(data) {
  console.log('generateExcelFile >>> ', data);

  var createXLSLFormatObj = [];
  var xlsHeader = [
    'domain',
    'first_name',
    'last_name',
    'title',
    'id',
    'company_name',
    'email'
  ];

  createXLSLFormatObj.push(xlsHeader);

  $.each(data, function(index, value) {
    var innerRowData = [];
    // $('tbody').append(
    //   '<tr><td>' +
    //     value.EmployeeID +
    //     '</td><td>' +
    //     value.FullName +
    //     '</td></tr>'
    // );
    $.each(value, function(ind, val) {
      innerRowData.push(val);
    });
    createXLSLFormatObj.push(innerRowData);
  });

  /* File Name */
  var filename = 'real-email-IDs.xlsx';

  /* Sheet Name */
  var ws_name = 'Sheet1';

  if (typeof console !== 'undefined') console.log(new Date());
  var wb = XLSX.utils.book_new(),
    ws = XLSX.utils.aoa_to_sheet(createXLSLFormatObj);

  /* Add worksheet to workbook */
  XLSX.utils.book_append_sheet(wb, ws, ws_name);

  /* Write workbook and Download */
  if (typeof console !== 'undefined') console.log(new Date());
  XLSX.writeFile(wb, filename);
  if (typeof console !== 'undefined') console.log(new Date());

  var html = $('#loading-search').html();
  $('#loading-search').html = html + `<a href="doesItWork.xlsx" download>`;

  // $('#loading-search').html(`<a href="doesItWork.xlsx" download>
  // `);
}

function sendAjaxCall(data, nullFiltered, i) {
  $.ajax({
    url: '/find',
    method: 'POST',
    data: JSON.stringify(data),
    timeout: 20000,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json'
  })
    .done(function(res) {
      console.log(i, 'found a match for : ', data.domain);
      console.log('Result : ', res);

      let result = { ...data, email: res.email };
      FOUND_ADDRESSES.push(result);

      $('#totalSearched').html(
        ` [` + FOUND_ADDRESSES.length + `/` + nullFiltered.length + ` ]`
      );

      if (i == nullFiltered.length - 1) {
        $('#search-msg').html(
          `Search Finished. [ ` +
            i +
            `/` +
            nullFiltered.length +
            ` ] <br /> Found valid email addresses : ` +
            FOUND_ADDRESSES.length
        );
        console.log('SEARCHED !!! ********************', FOUND_ADDRESSES);
        generateExcelFile(FOUND_ADDRESSES);
      }
    })
    .fail(function(err) {
      console.log(i, 'X NOT FOUND for : ', data.domain);
      console.log('err >>> ', err);

      if (i == nullFiltered.length - 1) {
        $('#search-msg').html(
          `Search Finished. [ ` +
            i +
            `/` +
            nullFiltered.length +
            ` ]  <br /> Found valid email addresses : ` +
            FOUND_ADDRESSES.length
        );
        console.log('SEARCHED !!! ********************', FOUND_ADDRESSES);
        generateExcelFile(FOUND_ADDRESSES);
      }
    });
}

const sleep = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

function onUploadFile() {
  const input = $('#excel-file');
  const file = input[0].files[0];
  console.log('onUploadFile >>> ', file);

  if (file) {
    $('.hide-while-searching').hide();
    $('#processing-data').show();

    console.log('processing ............');
    var reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async function(e) {
      var data = new Uint8Array(reader.result);
      var workbook = XLSX.read(data, { type: 'array' });

      // workbook.SheetNames.forEach(function(sheetName) {
      var XL_row_object = XLSX.utils.sheet_to_row_object_array(
        workbook.Sheets['Sheet1']
      );

      console.log('XL_row_object >>> ', XL_row_object);

      var nullFiltered = XL_row_object.filter(function(row) {
        if (row.EMAIL !== 'NULL') {
          row.WEBSITE = row.WEBSITE.replace('www.', '');
          row.WEBSITE = row.WEBSITE.replace('http://', '');
          row.WEBSITE = row.WEBSITE.replace('https://', '');
          row['FIRST NAME'] = row['FIRST NAME'].replace(/"/g, '');
          row['LAST NAME'] = row['LAST NAME'].replace(/"/g, '');
          return row;
        }
      });

      console.log('PROCESSED !!! ********************', nullFiltered);
      console.log('searching ............');

      $('#processing-data').hide();
      $('#loading-search').show();

      // nullFiltered.forEach(async (o, i) => {
      //   // hit the API here

      //   let data = {
      //     domain: o['WEBSITE'],
      //     first_name: o['FIRST NAME'],
      //     last_name: o['LAST NAME']
      //   };

      //   // console.log('data >>> ', data);

      //   if (i % 5 == 0 && i !== 0) {
      //     // wait for 30 seconds after each 5 data sets call.
      //     await sleep(30000);
      //     // setTimeout(() => {
      //     console.log('waiting at ... ', i, data);
      //     // sendAjaxCall(data, nullFiltered, i);
      //     // }, 30000);
      //   }

      //   console.log('running at ... ', i, data);
      //   // sendAjaxCall(data, nullFiltered, i);
      // });

      for (var j = 0; j < nullFiltered.length; j++) {
        let data = {
          domain: nullFiltered[j]['WEBSITE'],
          first_name: nullFiltered[j]['FIRST NAME'],
          last_name: nullFiltered[j]['LAST NAME'],
          title: nullFiltered[j]['TITLE'],
          id: nullFiltered[j]['ID'],
          company_name: nullFiltered[j]['COMPANY NAME']
        };

        if (j % 5 == 0 && j !== 0) {
          // wait for 30 seconds after each 5 data sets call.

          await sleep(120000);
          console.log('*** taking a break at', j, data);
          console.log('*** found so far >', FOUND_ADDRESSES);
          localStorage.setItem(
            'email-addresses-found',
            JSON.stringify(FOUND_ADDRESSES)
          );
          console.log(
            '-------------------------------------------------------------'
          );
        }
        console.log('running at ... ', j, data);
        sendAjaxCall(data, nullFiltered, j);
      }

      // });
    };
  }
}

/*
 * Validate the form
 *
 * - Check that fields aren't empty, if so add invalid class
 */
function validate(data) {
  var valid = true;

  for (var key in data) {
    var input = $("input[name='" + key + "']");

    if (!data[key]) {
      valid = false;
      input.addClass('invalid');
    } else {
      input.removeClass('invalid');
    }
  }

  return valid;
}

/*
 * Build data
 *
 * - Serialize form and build object
 */
function buildData(form) {
  return $(form)
    .serializeArray()
    .reduce(function(obj, item) {
      obj[item.name] = item.value.trim();

      if (obj[item.name]) {
        obj[item.name] = item.value.toLowerCase();
      }

      return obj;
    }, {});
}

/*
 * On submit handler
 */
function onSubmit(e) {
  var loadingCover = $('.loading-cover');
  var result = $('#result');

  e.preventDefault();

  // Get data from form
  var data = buildData(e.target);

  if (!validate(data)) {
    return;
  }

  console.log('data >>> ', data);
  // Show loading screen
  loadingCover.addClass('show');

  // Clear old result
  result.html('');

  $('#result').html;

  $.ajax({
    url: '/find',
    method: 'POST',
    data: JSON.stringify(data),
    timeout: 20000,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json'
  })
    .done(function(data) {
      // Hide loading screen
      loadingCover.removeClass('show');

      // Set result
      $('#result').html('Success! The email is: ' + data.email);

      // Count the number of submissions
      // sessionData.submissions++;

      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(sessionData)
      );

      checkSession();
    })
    .fail(function(err) {
      // Hide loading screen
      loadingCover.removeClass('show');

      // Set result
      $('#result').html('There was a problem finding the email.');
    });

  return false;
}

/*
 * Initialize
 */
function init() {
  $('#email-form').on('submit', onSubmit);
  $('#email-capture').on('submit', onEmailSubmit);

  $('#single-search').on('click', onSingleSearch);
  $('#multiple-search').on('click', onMultipleSearch);
  $('#upload-file').on('click', onUploadFile);

  $('.button-collapse').sideNav();

  $('.modal').modal({
    dismissible: false, // Modal can be dismissed by clicking outside of the modal
    opacity: 0.5, // Opacity of modal background
    in_duration: 300, // Transition in duration
    out_duration: 200, // Transition out duration
    starting_top: '4%', // Starting top style attribute
    ending_top: '10%' // Ending top style attribute
  });

  checkSession();
}

$('#email-form').hide();
$('#multiple-search-div').hide();
$('#processing-data').hide();
$('#loading-search').hide();

$(document).ready(init);
