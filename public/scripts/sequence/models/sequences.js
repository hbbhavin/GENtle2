/**
@module Sequence
@submodule Models
@class Sequences
**/
define(function(require) {
  var Sequence      = require('./sequence'),
      ls            = require('backbone.localstorage'),
      Sequences;

  Sequences = Backbone.Collection.extend({
    model: Sequence,
    localStorage: new Backbone.LocalStorage('Gentle-Sequences'),
    serialize: function() { return _.map(this.models, function(model) { return model.serialize(); }); }
  });

  return Sequences;
});