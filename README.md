Repository for Walking Bus server code. This code is a mix of two things: 1) the web portal for managing Walking Bus data (to be used by school admins) and 2) the server code that runs on a seperate server (AWS, Google Cloud, whatever hosting you'd like) and does automated tasks and CRON jobs.

So first of all bit of post-mortem here: Firebase is not the correct backend for this project. It works for the code given, but if you were to re-architect this project it should probably not use Firebase. Firebase provides a NoSQL database with just static file hosting. This means most of the logic for the backend happens on a seperate server that just listens for changes to the database. Furthermore, the database security rules aren't nearly robust enough to suit our needs. The database is not a relational database but the data being used here is very relational (especially because of the security and privacy concerns). There are many poor, hacky decisions that had to be made because they were deemed the way to do them (according to Firebase blogs, stack overflow, etc.).

It's easiest to manage Firebase through the web client, but that's tied to your Google account and difficult to transfer ownership. If you want access to the original Firebase project just message me. Otherwise I've stored the important stuff here (database rules and static files for the web portal).

Database Rules
---------------
Firebase's database is essentially one giant JSON file that prevents access to specific parts of the document based on your credentials. You provide a general layout for the database with rules by defining at a certain endpoint who can read and write to that endpoint. However, these rules get complicated very fast. There are rules that involve relative pathing so it looks like "newData.parent().parent().parent().parent() ... etc.". There's no better way to do this because we used multi-location updating (see later section).

Data duplication:
Data needs to be duplicated across the database to make checking rules possible and making accessing data efficient. As far as we could tell this was unavoidable. There's no way to run for-loops in the database security rules. There's no such thing as a JOIN in NoSQL, so data duplication needs to occur to achieve the same result.

Say Student X needs to verify that Parent Y can access their data and vice versa. Student X could contain a list of all parents that can access it, but how would Parent Y know the student can access its own data? Thus they both need lists of who can access their data. This is a very simple example, much more complicated examples exist in the rules we've made. In order to make working with this duplication feasible, Firebase allows you to write to multiple locations at once atomically. So when updating who can access Student X you may need to write to many locations at once atomically. This is called Multi-location updates.

Multi-location updates:
In order to avoid certain race-conditions, or the server getting into a bad state we would use multi-location updates (see data duplication section above). However, when doing multi-location updates, the data used by the database rules isn't fully propogated. So there's a variable you can access in the rules syntax called "root", but this "root" represents the data before the update takes affect. So you really want "newData" which represents a "what-if" scenario, basically saying "what if we accepted this update, what would the database look like"? Most of our security rules use newData to ensure consistency after an update occurs. There's no such thing as "newDataRoot" so you see a lot of relative pathing with variables.

Firebase Database Rules syntax leads to very obtuse and verbose security rules. There are even discontinued higher-level languages meant to compile down to Firebase Database Rules syntax.

Authentication:
The nicest thing about Firebase is it handles authentication almost perfectly. It will automatically generate a unique id for a user, and gives a really easy way to check if users are logged in. All testing was done with Google authentication, but there's very little reason it shouldn't work with other auth methods.

Web Portal
-------------
The Web Portal will manage (most) of the important information about the Walking Bus system. It will allow you to create routes, add chaperones to routes, manage a school's password, see students enrolled at a school, etc. The one major thing that the web portal doesn't support is creating schools and adding school admin to schools (this is done manually).

Creating Schools/Adding Admins:
See the following example school data
```
"schools" : {
  "school1" : {
    "admin" : {
      "5rSCNNx1ZnOEQMnCAehreGj0PCx2" : 1,
      "dDoWPfNcBVZOlfjGRYCI7dM8Uex1" : 1
    },
    ...
  },
  ...
}
```

This says that those user ids (uids) have the ability to admin the school with the id "school1". You will also need to put this school's id under said users too (because of data duplication). For example:
```
"users" : {
  "5rSCNNx1ZnOEQMnCAehreGj0PCx2" : {
    "displayName" : "Cassidy Burden",
    ...
    "schools" : {
      "school1" : "1",
      "school2" : "1",
      "school3" : "1"
    },
    ...
  },
  ...
}
```

This says that "Cassidy Burden" is an admin for "school1", "school2", and "school3".

The only other data that needs to be put in manually are lat/lng coordinates, a name for the school, and a "code" that parents have to put in in order to join the school.

Web Portal Code:
Because Firebase is all statically hosted content, the web portal is only html/css/js. All logic happens in the javascript. So the javascript code will see the user has clicked a button and will go directly to the Firebase database to update the relevant information. Of course this update may fail if the data fails the rules checks, so a lot of the code needs to check for and account for this.

A lot of the heavy lifting in the Web Portal, especially for the routes management, is done by the Google Maps API. It draws the maps, gives the interactive bits, etc. The Web Portal basically acts as a middle man between this Map and the Firebase database.

The UI for the Web Portal looks so good because of how great Materialize is. This is basically Bootstrap but for Material Design on the web.

Web Server Code
----------------
The web server (materialize/admin.js) is pretty hacky, and will probably need a large refactor if more features are added. Currently it does two things: sends notifications to parent's/chaperone's phones when an event occurs, and reset student statuses every 12 hours. The web server will require the following node modules: firebase_admin and node_cron. These can both be installed with npm. Running the server is easy just: "node admin.js". The very "walkingbus-9b5dc..." file is what allows the web server to authenticate with Firebase and perform admin actions (all of its actions ignore normal database security rules). This file will need to be reset when a new Firebase project is made.

Notifications:
Notifications are handled by Firebase, the web server just waits until a student's status is set to "lost" and figures out which phones it needs to alert. Each parent has an "FCM" identifier, this let's firebase know how it will route the notification to the right place. The "FCM" identifier will be set and updated by the app.

Resetting Statuses:
So when students are "dropped off" at school that status needs to eventually be set back to "waiting" when they are ready to be picked up. The web server will run a CRON job that does this every 12 hours. It will also, at the same time, update the time tracking on the backend (setting the current day of the week and what part of the day it is, am or pm).
