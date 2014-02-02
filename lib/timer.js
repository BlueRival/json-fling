"use strict";

var Timer = function () {
  this._date = null;
};

Timer.prototype.start = function () {
  this._date = new Date();
  return this;
};

Timer.prototype.stop = function () {
  var startDate = this._date;
  this._date = null;
  return (new Date().getTime() - startDate.getTime());
};

module.exports = Timer;
