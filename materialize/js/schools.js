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
  Materialize.updateTextFields();
}
