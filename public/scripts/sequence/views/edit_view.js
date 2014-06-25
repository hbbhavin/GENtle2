/**
@class EditView
@module Sequence
@submodule Views
**/
define(function(require) {
  var template = require('hbars!sequence/templates/edit_view'),
    Backbone = require('backbone.mixed'),
    Gentle = require('gentle')(),
    Sequences = require('sequence/models/sequences'),
    EditView;

  EditView = Backbone.View.extend({
    manage: true,
    template: template,

    initialize: function() {
      this.model = Gentle.currentSequence;
    },

    events: {
      'click input[type=button]': 'readAndUpdate',
    },

    readAndUpdate: function(event) {
      var descript = 'No Description';
      this.model.nameBefore = this.model.get('name');
      this.model.errors= {};

      event.preventDefault();

      this.model.set({
        name: this.$('#name').val(),
        description: this.$('#desc').val(),
      }, {
        validate: true
      });

      if (this.model.validationError != null) {
        if (this.model.validationError[0] == 'name') {
          this.model.errors.name = true;
          this.model.set('name', this.model.nameBefore);
          document.title = this.model.nameBefore + " / Gentle";
          this.model.set('desc', this.$('#desc').val());
        }
        if (this.model.validationError[0] == 'desc') {
          this.model.set('desc', descript);
          this.model.set('name', this.$('#name').val());
          document.title = this.$('#name').val() + " / Gentle";
        }
        if (this.model.validationError.length == 2) {
          this.model.set('name', this.model.nameBefore);
          this.model.set('desc', descript);
          document.title = this.model.nameBefore + " / Gentle";
        }
      } else {
        this.model.set('name', this.$('#name').val());
        this.model.set('desc', this.$('#desc').val());
        document.title = this.$('#name').val() + " / Gentle";
      }

      this.model.save();
      this.render();
    },

    serialize: function() {
      return {
        readOnly: this.model.get('readOnly'),
        Name: this.model.get('name'),
        Desc: this.model.get('desc'),
        error: this.model.errors || {}
      };

    },
  });

  return EditView;
});