"use strict";

var cron = require('node-cron');
var admin = require("firebase-admin");

var serviceAccount = require("./walkingbus-9b5dc-firebase-adminsdk-5dwk2-40152e7e06.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://walkingbus-9b5dc.firebaseio.com"
});

var FCM = "fWkWeJEkgBs:APA91bGoa1gHI75UoOuildWGiMp1-X_04tf3UsurRUVe1W0h6_sZM58lyGBXVWcAchk_5pDXHXq9xHep1c4IV19_PnCLW4Snugjp9wRFHGV3Va_YhEJftw33OBqoPjMJM-goaFKHxf0n"

var payload = {
  notification: {
    title: "Urgent action needed!",
    body: "Urgent action is needed to prevent your account from being disabled!"
  }
};

var students = {}
admin.database().ref('students').on('value', function(data) {
  data.forEach(function (student) {
    if (!(student.key in students)) {
      students[student.key] = student.val();
    } else {
      if (students[student.key] === 'lost' && student.val().status !== 'lost') {
        
        for (let p in students[student.key].parents) {
          console.log(p);
          admin.database().ref('users/' + p).once('value', function(pa) {
            console.log(pa.val());
            if (pa.hasChild('fcm')) {
              admin.messaging().sendToDevice(pa.child('fcm').val(), {
                notification: {
                  title: "Child is no longer lost",
                  body: students[student.key].name + " has been found again."
                }
              });
            }
          });
        }
      }
      if (student.val().status === 'lost') {
        console.log(students[student.key].name + " is lost! Do something, call 9-1-1!!!");

        for (let p in students[student.key].parents) {
          console.log(p);
          admin.database().ref('users/' + p).once('value', function(pa) {
            console.log(pa.val());
            if (pa.hasChild('fcm')) {
              admin.messaging().sendToDevice(pa.child('fcm').val(), {
                notification: {
                  title: "Child is lost",
                  body: students[student.key].name + " appears to be lost! Please check your surroundings and ensure their safety."
                }
              });
            }
          });
        }
      }
      students[student.key] = student.val();
    }
  });
});

function resetStatuses() {
  console.log('Resetting');
  admin.database().ref('/students/').once('value', function(data) {
    //console.log(student.key);
    data.forEach(function(student) {
      //console.log(student.key);
      admin.database().ref('/students/' + student.key + '/status').set('waiting');
    });
  });
}

function setCurrentTime() {
  var time = new Date();
  var hour = time.getHours();
  var day = time.getDay();

  var days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var ampm = (hour < 12) ? 'am' : 'pm';
  var time_str = days[day] + '_' + ampm;

  admin.database().ref('/current_timeslot/').set(time_str);
}

// At noon and midnight reset all student statuses to waiting
/*var setStatuses = cron.schedule('0 * 0,12 * * *', function() {
  resetStatuses();
  setCurrentTime();
});*/

resetStatuses();
setCurrentTime();
//admin.messaging().sendToDevice(FCM, payload); 
