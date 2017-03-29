var children = {};

function loadChild(school_id, child) {
  database.ref('/students/' + child).once('value').then(function(d) {
    children[school_id].push(d.val());
    render_children();
  });
}

var onSchoolsLoaded = function() {
  for (var s in schools) {
    children[s] = [];
    for (var c in schools[s].students) {
      loadChild(s, c);
    }
  }
}

function render_children() {
  var template = $('#template-children').html();
  Mustache.parse(template);
 
  var children_list = (school === null) ? [] : children[school];
  var rendered = Mustache.render(template, {
    "children" : children_list,
  });
  $('#target-children').html(rendered);
  $('.collapsible').collapsible();
}

var onSchoolChoice = function() {
  var template = $('#template-children').html();
  Mustache.parse(template);
 
  var children_list = (school === null) ? [] : children[school];
  var rendered = Mustache.render(template, {
    "children" : children_list,
  });
  $('#target-children').html(rendered);
  $('.collapsible').collapsible();
  Materialize.showStaggeredList('#childlist');
}

