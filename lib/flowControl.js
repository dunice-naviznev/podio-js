var events = require('events');
var Promise = require('es6-promise');
Promise = Promise.Promise; // unwrap

function FlowControl () {
  var _this     = this
    , remaining = 1000
    , interval
    , testUrl
    ;

  events.EventEmitter.call(this);

  this.setRemaining = function (response) {
    var limit;

    if (response.headers) {      
      if (response.headers["x-rate-limit-limit"]!==undefined) {
        limit = parseInt(response.headers["x-rate-limit-limit"])
        if (limit == 1000) {
          remaining = parseInt(response.headers["x-rate-limit-remaining"]); 
          console.log('remaining', remaining);
        }
      }
    }
  };

  this.setTestUrl = function  (url) {
      testUrl = url;
  };

  this.startChecking = function () {
    var self = this;

    if (!interval) {
      interval = setInterval(function () {
        self.request('GET', testUrl)
          .then(function (response) {
            if (remaining > 900) {
              clearInterval(interval);
              _this.release();
            }
          });
      }, 60000);
    }
  };

  this.handleRelease = function () {
    return new Promise(function(resolve, reject) {
      _this.once('release', function () {
        resolve()
      });
    })
  };

  this.request = function (method, path, data, options) {
    var self = this
      , args = arguments;

    if (remaining > 100) {
      return this.request.apply(this, args)
    } else {
      _this.startChecking.apply(this);
      return _this.handleRelease()
        .then(function () {
          return self.request.apply(self, args)
        })
    }
  };

  this.release = function () {
    this.emit('release');    
    interval = undefined;
  };
};

FlowControl.prototype.__proto__ = events.EventEmitter.prototype;


module.exports = FlowControl;