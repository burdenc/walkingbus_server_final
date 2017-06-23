var directionsDisplay;
var directionsService;

var routes = {};

var map_ready = false;
var map = null;
var loc = null;
var markers = {};
var current_marker = null;
var parents = {};

function initMap() {
  directionsService = new google.maps.DirectionsService;
  loc = google.maps.LatLng;
  map_ready = true;

  if (typeof school !== 'undefined' && school) {
    createMap(schools[school]);
  }
}

function createMap(school) { 
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 15,
    center: {lat: 0, lng: 0}
  });
  map.addListener('dblclick', function(e) {
    pos = e.latLng;
    newRoute(pos);
    e.preventDefault();
  });
  for (var marks of Object.values(markers)) {
    for (var m of marks) {
      m.setMap(map);
    }
  }
  directionsDisplay = new google.maps.DirectionsRenderer;
  directionsDisplay.setMap(map);
}

function newRoute(pos) {
  let r = {
    public : {
      name: '',
      time: '',
      location: pos,
      school: school,
      chaperones: {}
    },
    private : {
      status: 'waiting',
    },
    _new_route: true
  };

  routes[school].push(r);
  let m = createMarker(school, r); 

  let prev_marker = current_marker;
  current_marker = m;
  onMarkerChoice(prev_marker, current_marker);
}

function getDirections(marker, cb) { 
  let request = {
    origin: marker.position,
    destination: {
      lat: schools[school].lat,
      lng: schools[school].lng
    },
    travelMode: 'WALKING',
  };
  directionsService.route(request, cb);
}

function plotPath(marker) { 
  getDirections(marker, function(result, status) {
    directionsDisplay.setDirections(result);
  });
}

function createMarker(school_id, route) {
  let m = new google.maps.Marker({
    position: route.public.location,
    map: map,
    visible: true,
  });
  m.route = route;
  m.is_route = true;

  m.addListener('click', function() { 
      var prev_marker = current_marker;
      current_marker = m;
      onMarkerChoice(prev_marker, current_marker);
  });
  m.addListener('position_changed', function() {
    if (current_marker == m) {
      $("#lat").val(m.position.lat());
      $("#lng").val(m.position.lng());
    }
  });
  m.addListener('dragend', function() {
    plotPath(m);
  });

  markers[school_id].push(m);
  return m;
}

function loadRoute(school_id, route) {
  database.ref('/routes/' + route).once('value').then(function(d) {
    let r = d.val();
    r._id = route;
    r._new_route = false;
    createMarker(school_id, r);
    routes[school_id].push(r);
  });
}

function saveRoute(marker, distance, cb) {
  let s = school;
  let route = marker.route;
  if (route._new_route) {
    route._id = database.ref('/routes/').push().key;
  }

  // Filter out metadata
  let r = {};
  for (let k in route) {
    if (!k.startsWith('_')) {
      r[k] = JSON.parse(JSON.stringify(route[k]));
    }
  }
  r.public.location = {
    lat : Number.parseFloat($("#lat").val()),
    lng : Number.parseFloat($("#lng").val())
  }
  r.public.name = $("#name").val();
  r.public.time = $("#time").val();
  r.public.distance = distance;

  let chosen_chap = $("#chaperone").val();
  let found = false;
  for (let c in schools[school].users) {
    if (schools[school].users[c].displayName === chosen_chap) {
      found = true;
      r.public.chaperones = {};
      r.public.chaperones[c] = schools[school].users[c];
      break;
    }
  }
  if (!found) {
    Materialize.toast('Invalid chaperone', 3000);
    cb();
    return;
  }

  console.log(route);

  let updates = {};
  updates['/routes/' + route._id] = r;
  updates['/schools/' + s + '/routes/' + route._id] = '1';
  for (let c in route.public.chaperones) {
    console.log("Old Chap: " + c);
    updates['/users/' + c + '/routes/' + route._id] = null;
    updates['/schools/' + s + '/chaperones/' + c] = null;
  }
  for (let c in r.public.chaperones) {
    updates['/users/' + c + '/routes/' + route._id] = '1';
    updates['/schools/' + s + '/chaperones/' + c] = '1';
  }
  console.log(JSON.stringify(updates, 2, null));

  database.ref().update(updates).then(function() {
    Object.assign(route, r);
    route._new_route = false;
    marker.position = route.public.location;
    console.log('saved');
    Materialize.toast('Route saved!', 3000);
    cb();
  }, function(error) {
    Materialize.toast('Route could not be saved!', 3000);
    console.log(error);
    cb();
  });
}

function removeRoute(marker, cb) {
  let s = school;
  let route = marker.route;

  let updates = {};
  updates['/routes/' + route._id] = null;
  updates['/schools/' + s + '/routes/' + route._id] = null;
  for (let c in route.public.chaperones) {
    updates['/users/' + c + '/routes/' + route._id] = null;
  }
  for (let s in route.private.students) {
    for (let c in  route.public.chaperones) {
      updates['/students/' + s + '/routes/' + route._id] = null;
    }
  }
  
  database.ref().update(updates).then(function() {
    routes[school].splice(routes[school].indexOf(route), 1);
    markers[school].splice(markers[school].indexOf(marker), 1);
    marker.setMap(null);
    Materialize.toast('Route removed!', 3000);
    cb();
  }, function(error) {
    Materialize.toast('Route could not removed!', 3000);
    cb();
  });
}

var onSchoolsLoaded = function() {
  for (var s in schools) {
    routes[s] = [];
    markers[s] = [];
    let m = new google.maps.Marker({
      position: {lat: schools[s].lat, lng: schools[s].lng},
      icon: '../img/school.png',
      map: map,
      visible: true 
    });
    m.is_route = false
    markers[s].push(m);


    for (var r in schools[s].routes) {
      loadRoute(s, r);
    }
  }

  if (school) {
    render_map();
  }
}

var onSchoolChoice = function() {
  if (map_ready) {
    if (map === null) {
      createMap(schools[school]);
    }
    render_map(schools[school]);
  }
}

function onMarkerChoice(prev, current) {
  if (prev) {
    prev.setAnimation(null);
    prev.setPosition(prev.route.public.location);
    prev.setDraggable(false);
    if (prev.route._new_route) {
      routes[school].splice(routes[school].indexOf(prev.route), 1);
      markers[school].splice(markers[school].indexOf(prev), 1);
      prev.setMap(null);
    }
  }
  current.setAnimation(google.maps.Animation.BOUNCE);
  current.setDraggable(true);

  plotPath(current);
  render_route(current.route);
}

function scale_out(elem, cb) {
  elem.addClass('scale-out');
  setTimeout(cb, 500);
}

function scale_in(elem) {
  elem.removeClass('scale-out');
}

function button_loading(button, cb) {
  scale_out(button, function() {
    button.hide();
    button.next().show();
    cb();
  });
}

function button_loading_done(button) {
  button.next().hide();
  button.show();
  scale_in(button);
}

function render_route(route) {
  var template = $('#template-route-info').html();
  Mustache.parse(template);
 
  // Hacky pls fix
  for (let c in route.public.chaperones) {
    route._chaperonename = route.public.chaperones[c].displayName; 
  }
  console.log(route);
  var rendered = Mustache.render(template, route);
  $('#target-route-info').html(rendered);
  $('#save').click(function(e) {
    setTimeout(function() {
      button_loading($("#save"), function() { 
        // Re-calculate distance of route before saving
        getDirections(current_marker, function(result, status) {
          let distance = result.routes[0].legs[0].distance.value.toString();
          saveRoute(current_marker, distance, function() {
            button_loading_done($("#save"));
          });
        });
      });
    }, 300);
    e.preventDefault();
  });

  $('#remove').click(function(e) {
    setTimeout(function() {
      button_loading($("#remove"), function() { 
        removeRoute(current_marker, function() {
          scale_out($('#route-form'), function() {
            $('#target-route-info').html('');
          });
        });
      });
    }, 300);
    e.preventDefault();
  });
  Materialize.updateTextFields();

  parents = {
    data: {}
  }
  for (let p of Object.values(schools[school].users)) {
    parents.data[p.displayName] = p.photoUrl;
  }

  $('input.autocomplete').autocomplete(parents);
}

function render_map(schl) {
  // Remove old markers
  for (var s in schools) {
    for (var m of markers[s]) {
      m.setVisible(s == school);
      if (m.is_route) {
        m.setPosition(m.route.public.location);
      }
    }
  }
  $('#target-route-info').html('');

  map.panTo({lat: schl.lat, lng: schl.lng});
}
