"use strict";


/**
 * The prototype for the ContactsDisplay used by the ContactsPresenter.
 */
function ContactsDisplay() {}
// Event Callbacks (Will be set by presenter)
ContactsDisplay.prototype.onAddContact = function(contactEmail) {};
ContactsDisplay.prototype.onContactClick = function(contact) {};
ContactsDisplay.prototype.onWhoamiClick = function() {};

// Methods
ContactsDisplay.prototype.renderContacts = function (list) {};
ContactsDisplay.prototype.renderWhoAmI = function(user) {};
ContactsDisplay.prototype.showMessage = function(message) { window.alert(message); };


function ContactsPresenter(display, model) {
  this.display = display;
  this.model = model;

  var that = this;

  // Button Handlers  ---------------------------------------------------
  display.onAddContact = function(contactEmail) {
    that.addUserByEmail(contactEmail);
  };
  display.onContactClick = function(contact) {
    // Forward to the BUS => Other Module
    BUS.fire('contact.clicked', {
      'contact': contact,
      'actions': [
        {title: 'Remove Contact', callback: function() {
          that.removeContactFromRooster(contact.id);
        }}
      ]
    });
  };
  display.onWhoamiClick = function() {
    BUS.fire('ui.profile.show');
  }

  // WhoAmI  ---------------------------------------------------
  if (model.getUser()) {
    this.display.renderWhoAmI(model.getUser());
  }
  model.on('user', function(user) {
    this.display.renderWhoAmI(user);
  }, this);

  // ContactList  ---------------------------------------------------
  this.refreshContacts(); // Render initially
  model.on('update', this.refreshContacts, this);

  return that;
}
// Methods ---------------------------------------------------
ContactsPresenter.prototype.removeContactFromRooster = function(userId) {
  var that = this;
  this.model.removeContactFromRooster(userId, function(err) {
    that.refreshContacts();
  });
}
ContactsPresenter.prototype.refreshContacts = function () {
  var display = this.display;
  this.model.getContacts(function(err, data) {
    if (!err) {
      display.renderContacts(data);
    }
  });
};