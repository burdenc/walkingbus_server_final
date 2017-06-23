function scale_out(elem, cb) {
  elem.addClass('scale-out');
  setTimeout(cb, 500);
}

function scale_in(elem) {
  elem.removeClass('scale-out');
}

function button_loading_done(button) {
  button.next().hide();
  button.show();
  scale_in(button);
}

function button_loading(button, cb) {
  scale_out(button, function() {
    button.hide();
    button.next().show();
    cb();
  });
}

function saveSchool(school, cb) {
  school.name = $('#name').val();
  school.code = $('#code').val();

  updates = {}
  updates['/schools/' + school + '/name'] = schools[school].name;
  updates['/schools/' + school + '/code'] = schools[school].code;
  database.ref().update(updates).then(function() {
    Materialize.toast('School info saved!', 3000);
    cb();
  }, function(error) {
    Materialize.toast('School info could not be saved!', 3000);
    console.log(error);
    cb();
  });
}

function loadSchoolData(school, success, err) {
  let numberStudents = Object.keys(school.students).length;
  let numberLoaded = 0;
  let miles = [];
  let errored = false;

  for (let student of Object.keys(school.students)) {
    database.ref('/students/' + student).once('value', function(data) {
      numberLoaded++;

      let distance = 0;
      console.log(data);
      if (data.hasChild('distance'))
        distance = data.child('distance').val();

      miles.push(distance);

      if (numberLoaded == numberStudents) {
        success(miles);
      }
    }, function(error) {
      if (!errored) {
        errored = true;
        Materialize.toast('School info could not be saved!', 3000);
        console.log(error);
        err();
      }
    });
  }
}

var fileUrl = null;
function saveSchoolData(school, cb) {
  loadSchoolData(schools[school], function(miles) {
    miles_csv = schools[school].name + '\n' + 'Meters Walked,' + miles.join()
    let blob = new Blob([miles_csv], {type: 'text/csv'});
    if (fileUrl != null) {
      window.URL.revokeObjectURL(fileUrl);
    }
    fileUrl = window.URL.createObjectURL(blob);
    console.log(fileUrl);
    window.open(fileUrl);

    Materialize.toast('School info saved!', 3000);
    cb();
  }, function() { 
    Materialize.toast('School info could not be saved!', 3000);
    console.log(error);
    cb();
  });
}

var onSchoolsLoaded = function() {}

var onSchoolChoice = function() {
  var template = $('#template-school-info').html();
  Mustache.parse(template);

  var rendered = Mustache.render(template, schools[school]);
  $('#target-school-info').html(rendered);
  $('#save').click(function(e) {
    setTimeout(function() {
      button_loading($("#save"), function() { 
        saveSchool(school, function() {
          button_loading_done($("#save"));
        });
      });
    }, 300);
    e.preventDefault();
  });
  $('#save_data').click(function(e) {
    setTimeout(function() {
      button_loading($("#save_data"), function() { 
        saveSchoolData(school, function() {
          button_loading_done($("#save_data"));
        });
      });
    }, 300);
    e.preventDefault();
  });
  Materialize.updateTextFields();
}
