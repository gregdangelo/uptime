/**
 * Module dependencies.
 */

var util = require('util');
var url  = require('url');
var BasePoller = require('../basePoller');
var Phantom = require('node-phantom');
var config = require('config');

/**
 * Phantom Poller, to perform Phantom analysis on web pages
 *
 * @param {Mixed} Poller Target (e.g. URL)
 * @param {Number} Poller timeout in milliseconds. Without response before this duration, the poller stops and executes the error callback.
 * @param {Function} Error/success callback
 * @api   public
 */
function PhantomPoller(target, timeout, callback) {
  PhantomPoller.super_.call(this, target, timeout, callback);
}

util.inherits(PhantomPoller, BasePoller);

PhantomPoller.type = 'phantom';

PhantomPoller.validateTarget = function(target) {
  return url.parse(target).protocol == 'http:';
};

PhantomPoller.prototype.initialize = function() {
  this.timeout = 999999; // We can't know a test duration
  this.wpt = new Phantom(config.Phantom.server || 'www.phantom.org', config.Phantom.key);//no phatom.org makes no sense but hey right now it's just find and replace
};

/**
 * Launch the actual polling
 *
 * @api   public
 */
PhantomPoller.prototype.poll = function() {
  PhantomPoller.super_.prototype.poll.call(this);
  this.debug('Phantom start test [target='+this.target+']');
  this.wpt.runTest(this.target, config.Phantom.testOptions | {}, this.onTestStartedCallback.bind(this));
};

/**
 * Test started callback
 *
 * @api   private
 */
PhantomPoller.prototype.onTestStartedCallback = function(err,data){
  if (err) {
    console.log(err);
    this.timer.stop();
  } else {
    if (data.statusCode && data.statusCode == 200) {
      this.testId = data.data.testId;
      if (data.data.userUrl) {
        this.userUrl = data.data.userUrl;
      }
      this.debug('Phantom test started [testId='+this.testId+']');
      this.checkTestStatus();
    } else {
      return this.onErrorCallback({ name: "Test not started", message: data.statusText});
    }
  }
};

/**
 * TestStatus callback
 *
 * @api   private
 */
PhantomPoller.prototype.checkTestStatus = function(){
  var self = this;
  this.wpt.getTestStatus(this.testId, function(err, data) {
    if (err) {
      self.debug('Phantom checkTestStatus error');
      self.timer.stop();
      return;
    }
    if (data && data.statusCode == 200) {
      self.wpt.getTestResults(self.testId, function(err, data) {
        var docTime = parseInt(data.response.data.average.firstView.docTime, 10);
        self.debug('PhantomResults received [docTime=' + docTime + ']');
        self.timer.stop();
        if (self.userUrl) {
          self.callback(null, docTime, {}, { url: self.userUrl });
        } else {
          self.callback(null, docTime, {});
        }
      });
    } else {
      self.testStatusTimeout = setTimeout(self.checkTestStatus.bind(self), 5000);
    }
  });
};

/**
 * Timeout callback
 *
 * @api   private
 */
PhantomPoller.prototype.timeoutReached = function() {
  this.debug('PhantomPoller timeoutReached call');
  PhantomPoller.super_.prototype.timeoutReached.call(this);
  var self = this;
  if (typeof this.timeout !== undefined) {
    this.wpt.cancelTest(this.testId, function(err,data) {
      self.debug('Phantom test started [testId=' + self.testId + ']');
    });
  }
};

module.exports = PhantomPoller;
