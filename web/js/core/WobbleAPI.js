"use strict";

function OfflineWrapper(rpc) {
  this.rpc = rpc;
  this.online = true;
  this.retryCounter = 0;
  this.queue = [];
  
  BUS.on('rpc.connectionerror', function() {
    this.goOffline();
  }, this);
};
OfflineWrapper.prototype.doRPC = function(name, parameters, callback) {
  var that = this;
  if (this.online) {
    this.rpc.doRPC(name, parameters, function(err) {
      // If the wrapper is offline, we requeue
      if (err && err.error === 'connectionerr' && !that.online) {
        that.queue.push([name, parameters, callback]);
        return true;
      } else {
        return callback.apply(window, arguments);
      }
    })
  } else {
    this.queue.push([name, parameters, callback]);
  }
};
OfflineWrapper.prototype.goOffline = function() {
  // New calls to doRPC are now queued. We still the failed request
  this.online = false;
  BUS.fire('connection.state', 'offline');

  var that = this;
  setTimeout(function() {
    that.checkOnline();
  }, 100 + (this.retryCounter++) * 500);
  this.retryCounter = Math.min(10, this.retryCounter);
};
OfflineWrapper.prototype.goOnline = function () {
  this.online = true;

  for (var i = 0; i < this.queue.length; i++) {
    var item = this.queue[i];
    this.doRPC.apply(this, item);
  }

  BUS.fire('connection.state', 'online');  
};


OfflineWrapper.prototype.checkOnline = function() {
  var that = this;
  this.rpc.doRPC('wobble.api_version', function(err, result) {
    if (err) {
      that.goOffline();
    } else {
      that.goOnline();
    }
  });
};

// API Wrapper functions
var WobbleAPI = function(rpc, callback) {
  if (!rpc) {
    throw new Error('RPC object is required for WobbleAPI object');
  }
  this.rpc = rpc;
  this._user = undefined;
  this.apikey = {
    'value': localStorage.getItem('WOBBLEAPI_APIKEY'),
    'get': function() {
      return this.value;
    },
    'set': function(apikey) {
      this.value = apikey;
      if (!apikey) {
        localStorage.removeItem('WOBBLEAPI_APIKEY');
      } else {
        localStorage.setItem('WOBBLEAPI_APIKEY', apikey);
      }
    }
  };

  if (this.apikey.get()) {
    this.refreshUser(callback);
  } else {
    if(callback) callback(null);
  }
};
WobbleAPI.prototype.destroy = function() {};
/**
 * Adds the apikey to the parameters and call the doRPC method of the rpc object.
 *
 * @see this.rpc
 */
WobbleAPI.prototype.doRPC = function(name, params, callback) {
  if(this.apikey.get()) {
    if(typeof(params) == "function") {
      callback = params;
      params = {
        'apikey': this.apikey.get()
      };
    } else if(params == undefined) {
      params = {
        'apikey': this.apikey.get()
      };
    } else {
      params.apikey = this.apikey.get();
    }
  }
  this.rpc.doRPC(name, params, callback);
};

WobbleAPI.prototype.refreshUser = function(callback) {
  this.user_get($.proxy(function(err, user) {
    if (!err) {
      this._user = user;
      BUS.fire('api.user', user);
      if (callback) {
        return callback(user);
      }
    }
  }, this));
};

// Directly returning functions
/** Builds an ID by combining the user_id with the current time. */
WobbleAPI.prototype.generate_id = function() {
  var id = this.user_id() + "-" + (new Date().getTime()) + "-" + Math.ceil(Math.random() * 100000);
  return id;
};
WobbleAPI.prototype.user_id = function() {
  return this._user ? this._user.id : null;
};
WobbleAPI.prototype.user = function() {
  return this._user;
},

// Async stuff
/* Core / Basic Stuff */
WobbleAPI.prototype.wobble_api_version = function(callback) {
  this.doRPC('wobble.api_version', callback);
};
WobbleAPI.prototype.systemListMethods = function(callback) {
  this.doRPC('system.listMethods', callback); 
};

/* Notifications */
WobbleAPI.prototype.get_notifications = function(timestamp, callback) {
  this.doRPC('get_notifications', {next_timestamp: timestamp}, callback);
};

/* REGISTER / LOGIN ----------------- */
WobbleAPI.prototype.register = function(email, password, callback) {
  var that = this;
  this.rpc.doRPC('user_register', {'email': email, 'password': password}, function(err, result) {
    if(!err && result.apikey) {
      that.apikey.set(result.apikey);
    }
    if(callback)
      return callback(err, result);
  });
};
WobbleAPI.prototype.login = function(email, password, callback) {
  var that = this;
  this.doRPC('user_login', {'email': email, 'password': password}, function(err, result) {
    if(!err && result.apikey)
      that.apikey.set(result.apikey);

    if(callback)
      return callback(err, result);
  });
};
WobbleAPI.prototype.signout = function(callback) {
  var that = this;
  this.doRPC('user_signout', function(err, result) {
    that.apikey.set(undefined);
    if(callback)
      return callback(err, result);
  });
};
WobbleAPI.prototype.user_change_password = function(newPassword, callback) {
  this.doRPC('user_change_password', {password: newPassword}, callback);
};
WobbleAPI.prototype.user_change_name = function(newName, callback) {
  this.doRPC('user_change_name', {name: newName}, callback);
};
WobbleAPI.prototype.user_get = function(callback) {
  this.doRPC('user_get', callback);
};

/* TOPICS Functions ----------------- */
WobbleAPI.prototype.topics_create = function(id, callback) {
  this.doRPC('topics_create', {id: id}, callback);
};

WobbleAPI.prototype.load_topic_details = function(topicId, callback) {
  this.doRPC('topic_get_details', {id: topicId}, callback);
};

WobbleAPI.prototype.list_topics = function (show_archived, callback) {
  this.doRPC('topics_list', {'archived': show_archived}, callback);
};

/* CONTACTS Functions --------------- */
WobbleAPI.prototype.add_contact = function(email, callback) {
  this.doRPC('user_add_contact', {'contact_email': email}, callback);
};
WobbleAPI.prototype.get_contacts = function (callback) {
  this.doRPC('user_get_contacts', callback);
};
WobbleAPI.prototype.contact_remove = function(contact_id, callback) {
  this.doRPC('user_remove_contact', {contact_id: contact_id}, callback);
};

/* TOPIC Functions ------------------ */
WobbleAPI.prototype.topic_add_user = function(topicId, contactId, callback) {
  this.doRPC('topic_add_user', {topic_id: topicId, contact_id: contactId}, callback);
};
WobbleAPI.prototype.topic_remove_user = function(topicId, contactId, callback) {
  this.doRPC('topic_remove_user', {topic_id: topicId, contact_id: contactId}, callback);
};
WobbleAPI.prototype.topic_set_archived = function topic_set_archived(topicId, archived, callback) {
  this.doRPC('topic_set_archived', {topic_id: topicId, archived: archived}, callback);
};
WobbleAPI.prototype.topic_remove_message = function topic_remove_message(topicId, messageId, callback) {
  this.doRPC('topic_remove_message', {topic_id: topicId, message_id: messageId}, callback);
}

WobbleAPI.prototype.post_change_read = function(topicId, postId, readStatus, callback) {
  this.doRPC('post_change_read', {topic_id: topicId, post_id: postId, read: readStatus}, callback);
};
WobbleAPI.prototype.post_change_lock = function(topicId, postId, lockStatus, callback) {
  this.doRPC('post_change_lock', {topic_id: topicId, post_id: postId, lock: lockStatus}, callback);
};
WobbleAPI.prototype.post_create = function(topicId, postId, parentPostId, intendedReply, callback) {
  this.doRPC(
    'post_create',
    {topic_id: topicId, post_id: postId, parent_post_id: parentPostId, intended_reply: intendedReply},
    callback
  );
};
WobbleAPI.prototype.post_edit = function(topicId, postId, content, revision_no, callback) {
  this.doRPC('post_edit', {topic_id: topicId, post_id: postId, revision_no: revision_no, content: content}, callback);
};
WobbleAPI.prototype.post_delete = function(topicId, postId, callback) {
  this.doRPC('post_delete', {topic_id: topicId, post_id: postId}, callback);
};

