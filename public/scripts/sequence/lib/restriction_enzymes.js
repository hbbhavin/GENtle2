define(function(require) {
  var SynbioData = require('common/lib/synbio_data'),
      SequenceTransforms = require('./sequence_transforms'),
      iupacToBases,
      restrictionEnzymes,
      restrictionEnzymesByBases,
      restrictionEnzymesByLength,
      RestrictionEnzymes;

  iupacToBases = SequenceTransforms.iupacToBases;
  reverseComplements = SequenceTransforms.toReverseComplements;

  RestrictionEnzymes = {};

  RestrictionEnzymes.all = function() {
    restrictionEnzymes = restrictionEnzymes || (function() {
      return _.map(SynbioData.restriction_enzymes, function(enzyme) {
        return _.extend(enzyme, {
          // isPalyndromic: bases == reverseComplements(bases)
        });
      });
    })();

    return restrictionEnzymes;
  };

  RestrictionEnzymes.getRegExp = _.memoize2(function(iupacSequence) {
    var pattern = '',
        base;

    for(var i = 0; i < iupacSequence.length; i++) {
      base = iupacToBases(iupacSequence[i]);
      pattern += base.length == 1 ? base : '[' + base + ']';
    }

    return new RegExp(pattern, 'gi');
  });

  RestrictionEnzymes.byBases = function() {
    restrictionEnzymesByBases = restrictionEnzymesByBases || (function() {
      var output = {};
      _.each(RestrictionEnzymes.all(), function(enzyme) {
        var bases = enzyme.seq;
        output[bases] = output[bases] || [];
        output[bases].push(enzyme);
      });
      return output;
    })();
    return restrictionEnzymesByBases;
  };

  RestrictionEnzymes.byLength = function() {
    restrictionEnzymesByLength = restrictionEnzymesByLength || (function() {
      var output = {};
      _.each(RestrictionEnzymes.all(), function(enzyme) {
        var length = enzyme.seq.length,
            bases = enzyme.seq;
        output[length] = output[length] || {};
        output[length][bases] = output[length][bases] || [];
        output[length][bases].push(enzyme);
      });
      return output;
    })();
    return restrictionEnzymesByLength;
  };

  RestrictionEnzymes.getAllInSeq = function(seq, options) {
    var matches = {},
        list,
        checkAndAddMatch;
    options = options || {}; 

    checkAndAddMatch = function(enzymes, bases) {
      var regexp = RestrictionEnzymes.getRegExp(bases),
          result;

      while(result = regexp.exec(seq)) {
        matches[result.index] = (matches[result.index] || []).concat(enzymes);
      }
    };

    if(options.manualList !== undefined && options.manualList !== '') {
      list = options.manualList.split(',');
      _.each(RestrictionEnzymes.all(), function(enzyme) {
        if(~list.indexOf(enzyme.name)) checkAndAddMatch(enzyme, enzyme.seq);
      });
    } else if(options && options.length) {
      if(!_.isArray(options.length)) options.length = [options.length];
      _.each(options.length, function(length) {
        _.each(RestrictionEnzymes.byLength()[length], checkAndAddMatch);
      });
    } else {
      _.each(RestrictionEnzymes.byBases(), checkAndAddMatch);
    }

    return matches;
  };

  RestrictionEnzymes.maxLength = _.memoize(function() {
    return _.max(_.map(RestrictionEnzymes.all(), function(enzyme) {
      return enzyme.seq.length;
    }));
  });

  window.re = RestrictionEnzymes;
  window.st = SequenceTransforms;

  return RestrictionEnzymes;
});