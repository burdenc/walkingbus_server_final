'use strict';

var provider = new firebase.auth.GoogleAuthProvider();
var auth = firebase.auth();
var database = firebase.database();

// Current user stuff
var user = null;
var remote_user = null;

// School selection stuff
var schools = {};
var school = null;

var onUserLoadCallback = function() {
  if (remote_user.schools) {
    for (var s in remote_user.schools) {
      database.ref('/schools/' + s).once('value').then(function(d) {
        var school_id = d.key;
        schools[school_id] = d.val();
        render_schools();
      
        if (Object.keys(schools).length === Object.keys(remote_user.schools).length) {
          onSchoolsLoaded();
        }
      });
    }
  } else {
    render_schools(schools);
  }
}

auth.onAuthStateChanged(function(u) {
  if (u) {
    user = u;
    database.ref('users/' + u.uid).once('value').then(function(d) {
      if (d.val() == null) {
        database.ref('users/' + u.uid).set({
          displayName: u.displayName,
          photoUrl: u.photoURL,
          phone: "",
          email: u.email
        });
      }
      remote_user = d.val();
      onUserLoadCallback();
    });
  
    onAuthCallback();
  } else {
    auth.signInWithRedirect(provider);
  }
});

function render_loading(target) {
  target.html($('#template-loading').html());
}

function render_schools() {
  var template = $('#template-schools').html();
  Mustache.parse(template);
  
  let schools_list = (school === null) ? [] : schools[school];
  for (var s in schools) {
    schools_list.push({'key' : s, 'name' : schools[s].name});
  }
  var rendered = Mustache.render(template, {
    "schools" : schools_list
  });
  $('#target-schools').html(rendered);
  $('select').material_select();
  $('select').change(function(e) {
    school = $('select option:selected')[0].value;
    onSchoolChoice();
  });
}

$(document).ready(function() {
  $(".dropdown-button").dropdown();
  $(".button-collapse").sideNav();

  $(".signout").click(function(e) {
    auth.signOut();
  });

  render_loading($("#target-schools"));
});
