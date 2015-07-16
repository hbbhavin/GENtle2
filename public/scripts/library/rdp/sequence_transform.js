import _ from 'underscore';
import data from '../../common/lib/synbio_data';

import SequenceRange from '../sequence-model/range';
import RdpSequenceFeature from './rdp_sequence_feature';
import RdpEdit from './rdp_edit';
import RdpTypes from './rdp_types';


var CONTEXT_BASE_PAIRS = 9;


var getLen = function(sequenceModel) {
 return sequenceModel.getLength(sequenceModel.STICKY_END_ANY);
};


var getSubSeq = function(sequenceModel, frm, size) {
 return sequenceModel.getSubSeqExclusive(frm, size, sequenceModel.STICKY_END_ANY);
};


var isMultipleOf3 = function(sequenceModel) {
  return getLen(sequenceModel) % 3 === 0;
};


var warnIfNotMultipleOf3 = function(sequenceModel, rdpEditType) {
  var rdpEdit;
  if(!isMultipleOf3(sequenceModel)) {
    var message = `Requires sequence to be a mutliple of 3 but is "${getLen(sequenceModel)}" long.`;
    rdpEdit = new RdpEdit({type: rdpEditType, level: RdpEdit.levels.WARN, message});
  }
  return rdpEdit;
};


var warnIfStickyEndsPresent = function(sequenceModel, rdpEditType) {
  var rdpEdit;
  if(sequenceModel.getStickyEnds(false)) {
    var message = `Sequence can not have stickyEnds.`;
    rdpEdit = new RdpEdit({type: rdpEditType, level: RdpEdit.levels.WARN, message});
  }
  return rdpEdit;
};


/**
 * @function warnIfShortSequence  This function is used to ensure a minimum of 3
 * base pairs is present, which is required by some of the functions.
 * In reality this will likely never error because the RDP oligo part creation
 * should be triggered for short sequences.
 * @param  {SequenceModel} sequenceModel
 * @param  {String} rdpEditType
 * @return {RdpEdit}
 */
var warnIfShortSequence = function(sequenceModel, rdpEditType) {
  var rdpEdit;
  var length = getLen(sequenceModel);
  if(length < 3) {
    var message = `Requires sequence to be at least 3 base pairs long but is "{len(sequenceModel)}" long.`;
    rdpEdit = new RdpEdit({type: rdpEditType, level: RdpEdit.levels.WARN, message});
  }
  return rdpEdit;
};


var throwErrorIfPresent = function(func, sequenceModel, rdpEditType) {
  var rdpEdit = func(sequenceModel, rdpEditType);
  if(rdpEdit && rdpEdit.message) throw new Error(rdpEdit.message);
};


/**
 * @function  methionineStartCodon
 * @param  {SequenceModel}  sequenceModel
 * @throws {Error} If sequenceModel has stickyEnds or is too short
 * @return {Array<RdpEdit>}  May return RdpEdits in normal or error state
 */
var methionineStartCodon = function(sequenceModel) {
  var genericType = RdpEdit.types.METHIONINE_START_CODON;
  throwErrorIfPresent(warnIfStickyEndsPresent, sequenceModel, genericType);
  throwErrorIfPresent(warnIfShortSequence, sequenceModel, genericType);

  var rdpEdit;
  var length = getLen(sequenceModel);
  let sequenceBases = getSubSeq(sequenceModel, 0, 3);
  const METHIONINE = _.find(data.aa, (aa) => aa.short === 'M').codons[0];

  if(sequenceBases !== METHIONINE) {
    var quietlyAddedMethionine = false;
    var type, name, desc, sequence, contextBefore, contextAfter, contextualTo;
    var ranges = [];
    var size = 3;
    var contextualFrom = 0;

    let options = {stickyEndFormat: sequenceModel.STICKY_END_ANY};
    if(sequenceBases === 'GTG' || sequenceBases === 'TTG') {
      type = RdpEdit.types.METHIONINE_START_CODON_CONVERTED;
      name = 'Will modify ' + sequenceBases;
      desc = 'Will modify start codon to be ATG (Methionine)';
      ranges = [new SequenceRange({
        name: name,
        from: 0,
        size: size,
      })];

      // Get a sequence snippet before
      contextualTo = Math.min(length, size + CONTEXT_BASE_PAIRS);
      sequence = getSubSeq(sequenceModel, contextualFrom, contextualTo);
      contextBefore = new RdpSequenceFeature({name, desc, ranges, _type: type, sequence, contextualFrom, contextualTo});

      sequenceModel.changeBases(0, METHIONINE, options);

      name = 'Modified ' + sequenceBases;
      desc = 'Modified start codon to be ATG (Methionine)';
      ranges = [new SequenceRange({
        name: name,
        from: 0,
        size: size,
      })];

      // Get a sequence snippet after
      sequence = getSubSeq(sequenceModel, contextualFrom, contextualTo);
      contextAfter = new RdpSequenceFeature({name, desc, ranges, _type: type, sequence, contextualFrom, contextualTo});
    } else {
      type = RdpEdit.types.METHIONINE_START_CODON_ADDED;
      var quietlyAddMethionine = false;
      if(!quietlyAddMethionine) {
        name = 'Will insert ATG';
        desc = 'Will insert ATG (Methionine) start codon';

        // Get a sequence snippet before
        contextualTo = Math.min(length, CONTEXT_BASE_PAIRS);
        sequence = getSubSeq(sequenceModel, contextualFrom, contextualTo);
        contextBefore = new RdpSequenceFeature({name, desc, ranges, _type: type, sequence, contextualFrom, contextualTo});

        name = 'Inserted ATG';
        desc = 'Inserted ATG (Methionine) start codon';
      }
      sequenceModel.insertBases(METHIONINE, 0, options);
      if(quietlyAddMethionine) {
        quietlyAddedMethionine = true;
      }
      if(!quietlyAddMethionine) {
        ranges = [new SequenceRange({
          name: name,
          from: 0,
          size: size,
        })];
        // Get a sequence snippet after
        length = getLen(sequenceModel);
        contextualTo = Math.min(length, size + CONTEXT_BASE_PAIRS);
        sequence = getSubSeq(sequenceModel, contextualFrom, contextualTo);
        contextAfter = new RdpSequenceFeature({name, desc, ranges, _type: type, sequence, contextualFrom, contextualTo});
      }
    }
    if(!quietlyAddedMethionine) {
      rdpEdit = new RdpEdit({type, contextBefore, contextAfter});
    }
  }
  return rdpEdit ? [rdpEdit] : [];
};


/**
 * @method noTerminalStopCodons
 * @param  {SequenceModel}  sequenceModel
 * @throws {Error} If sequenceModel has stickyEnds or sequence is not a multiple of 3
 * @return {Array<RdpEdit>}
 */
var noTerminalStopCodons = function(sequenceModel) {
  var type = RdpEdit.types.TERMINAL_STOP_CODON_REMOVED;
  throwErrorIfPresent(warnIfNotMultipleOf3, sequenceModel, type);
  throwErrorIfPresent(warnIfStickyEndsPresent, sequenceModel, type);

  var rdpEdit, frm;
  var length = getLen(sequenceModel);
  var aAsToRemove = [];

  while(true) {
    var newFrom = length - (3 * (aAsToRemove.length + 1));
    newFrom = Math.max(0, newFrom);
    if(newFrom === frm) {
      // We've run out of sequence to search
      break;
    }
    var aAs = sequenceModel.getAAs(newFrom, 3, sequenceModel.STICKY_END_ANY);
    if(aAs.length === 1 && aAs[0] === 'X') {
      aAsToRemove.push(newFrom);
      frm = newFrom;
    } else {
      // aAsToRemove has remained unaltered.
      break;
    }
  }

  if(aAsToRemove.length) {
    var name = 'Will remove stop codons';
    var desc = `Will remove ${aAsToRemove.length} stop codon(s)`;
    var ranges = _.map(aAsToRemove, (frmBase) => {
      return new SequenceRange({
        name: 'Stop codon',
        from: frmBase,
        size: 3,
      });
    });

    // Get a sequence snippet before transform
    var contextualFrom = Math.max(0, frm - CONTEXT_BASE_PAIRS);
    var numberOfBasesToRemove = 3 * aAsToRemove.length;
    var numberOfBasesInContextBefore = Math.min(length - contextualFrom, CONTEXT_BASE_PAIRS + numberOfBasesToRemove);
    var sequence = getSubSeq(sequenceModel, contextualFrom, numberOfBasesInContextBefore);
    var contextualTo = frm + numberOfBasesToRemove;
    var contextBefore = new RdpSequenceFeature({name, desc, ranges, _type: type, sequence, contextualFrom, contextualTo});

    // Transform sequence
    _.each(aAsToRemove, (frmBase) => {
      sequenceModel.deleteBases(frmBase, 3, {stickyEndFormat: sequenceModel.STICKY_END_ANY});
    });

    // Remove terminal stop codon
    name = 'Removed stop codons';
    desc = `Removed ${aAsToRemove.length} terminal stop codons`;
    ranges = [];

    // Get a sequence snippet after
    var numberOfBasesInContextAfter = Math.min(length - contextualFrom, CONTEXT_BASE_PAIRS);
    sequence = getSubSeq(sequenceModel, contextualFrom, numberOfBasesInContextAfter);
    contextualTo = frm;
    var contextAfter = new RdpSequenceFeature({name, desc, ranges, _type: type, sequence, contextualFrom, contextualTo});

    rdpEdit = new RdpEdit({type, contextBefore, contextAfter});
  }

  return rdpEdit ? [rdpEdit] : [];
};


var terminalCBaseAaMapConservativeChange = {
  // Tryptophan -> Tyrosine
  "TGG": "TAC",
  // Glutamine -> Asparagine
  "CAA": "AAC",
  "CAG": "AAC",
  // Methionine -> Leucine
  "ATG": "CTC",
  // Lysine -> Arginine
  "AAA": "CGC",
  "AAG": "CGC",
  // Glutamic acid -> Aspartic acid
  "GAA": "GAC",
  "GAG": "GAC",
};

var terminalCBaseAaMap = _.extend(_.clone(terminalCBaseAaMapConservativeChange), {
  // Alanine
  "GCT": "GCC",
  "GCA": "GCC",
  "GCG": "GCC",
  // Leucine
  "TTA": "CTC",
  "TTG": "CTC",
  "CTT": "CTC",
  "CTA": "CTC",
  "CTG": "CTC",
  // Arginine
  "CGT": "CGC",
  "CGA": "CGC",
  "CGG": "CGC",
  "AGA": "CGC",
  "AGG": "CGC",
  // Asparagine
  "AAT": "AAC",
  // Aspartic acid
  "GAT": "GAC",
  // Phenylalanine
  "TTT": "TTC",
  // Cysteine
  "TGT": "TGC",
  // Proline
  "CCT": "CCC",
  "CCA": "CCC",
  "CCG": "CCC",
  // Serine
  "TCT": "TCC",
  "TCA": "TCC",
  "TCG": "TCC",
  "AGT": "AGC",
  // Threonine
  "ACT": "ACC",
  "ACA": "ACC",
  "ACG": "ACC",
  // Glycine
  "GGT": "GGC",
  "GGA": "GGC",
  "GGG": "GGC",
  // Histidine
  "CAT": "CAC",
  // Tyrosine
  "TAT": "TAC",
  // Isoleucine
  "ATT": "ATC",
  "ATA": "ATC",
  // Valine
  "GTT": "GTC",
  "GTA": "GTC",
  "GTG": "GTC",

  // Stop codons (no conversion available, should not be present)
  "TAG": undefined,
  "TGA": undefined,
  "TAA": undefined,
});

var baseMappingData = {
  'C': {
    aaMap: terminalCBaseAaMap,
    aaConversativeMap: terminalCBaseAaMapConservativeChange,
    type: RdpEdit.types.LAST_BASE_IS_C,
    type_no_change: RdpEdit.types.LAST_BASE_IS_C_NO_AA_CHANGE,
  }
};


/**
 * @method ensureLastBaseIs returns a function.
 * @param {String} ensureBase  The base to ensure is present on the forward
 *                             strand as the last base.
 * @return {function} transformationFunction
 *                    @param  {SequenceModel}  sequenceModel
 *                    @throws {Error} If sequenceModel has stickyEnds or
 *                                    sequence is not a multiple of 3
 *                    @return {Array<RdpEdit>}
 */
var ensureLastBaseIs = function(ensureBase) {
  var data = baseMappingData[ensureBase];
  if(!data) throw new Error(`ensureLastBaseIs does not yet support base of: "${ensureBase}".`);

  var transformationFunction = function(sequenceModel) {
    var type = data.type;
    throwErrorIfPresent(warnIfNotMultipleOf3, sequenceModel, type);
    throwErrorIfPresent(warnIfShortSequence, sequenceModel, type);
    throwErrorIfPresent(warnIfStickyEndsPresent, sequenceModel, type);

    var length = getLen(sequenceModel);
    var rdpEdit;

    // Due to validation from `warnIfNotMultipleOf3` and `warnIfShortSequence`,
    // length will be >= 3 and a multiple of 3.
    let frm = length - 3;
    let lastCodon = getSubSeq(sequenceModel, frm, 3);
    if(lastCodon[2] !== ensureBase) {
      let replacement = data.aaMap[lastCodon];
      // Check to see if amino acid changed
      var aaChanged = !!data.aaConversativeMap[lastCodon];
      if(replacement && !aaChanged) type = data.type_no_change;
      var name = `Last base should be "${ensureBase}"`;
      var desc = '';
      var message;
      var level;

      var ranges = [new SequenceRange({
        name: `Not "${ensureBase}"`,
        from: frm + 2,
        size: 1
      })];

      // Get a sequence snippet before
      var contextualFrom = Math.max(0, frm - CONTEXT_BASE_PAIRS + 3);
      var sequence = getSubSeq(sequenceModel, contextualFrom, CONTEXT_BASE_PAIRS);
      var contextualTo = frm + 3;
      var contextBefore = new RdpSequenceFeature({name, desc, ranges, _type: type, sequence, contextualFrom, contextualTo});

      var rangeName;
      if(replacement) {
        sequenceModel.changeBases(frm, replacement, {stickyEndFormat: sequenceModel.STICKY_END_ANY});

        name = `Last base changed to "${ensureBase}".`;
        desc = `The last base of sequence must be "${ensureBase}".  Codon has been automatically transform from "${lastCodon}" to "${replacement}".`;
        rangeName = `Changed to "${ensureBase}"`;
      } else {
        // This should never be reached if the `transformSequenceForRdp` is
        // called as all the stop codons at the end will already have been
        // removed
        name = `Last base not "${ensureBase}"`;
        rangeName = `Not "${ensureBase}"`;
        desc = message = `The last base of sequence must be "${ensureBase}" but there is no replacement for the codon: "${lastCodon}".`;
        level = RdpEdit.levels.ERROR;
      }
      ranges = [new SequenceRange({
        name: rangeName,
        from: frm + 2,
        size: 1
      })];

      sequence = getSubSeq(sequenceModel, contextualFrom, CONTEXT_BASE_PAIRS);
      var contextAfter = new RdpSequenceFeature({name, desc, ranges, _type: type, sequence, contextualFrom, contextualTo});

      rdpEdit = new RdpEdit({type, contextBefore, contextAfter, message, level});
    }
    return rdpEdit ? [rdpEdit] : [];
  };

  return transformationFunction;
};


/**
 * @function  warnIfEarlyStopCodons
 * @param  {SequenceModel} sequenceModel
 * @return {Array<RdpEdit>}
 */
var warnIfEarlyStopCodons = function(sequenceModel) {
  var type = RdpEdit.types.EARLY_STOP_CODON;
  throwErrorIfPresent(warnIfNotMultipleOf3, sequenceModel, type);
  throwErrorIfPresent(warnIfStickyEndsPresent, sequenceModel, type);

  var aAs = sequenceModel.getAAs(0, getLen(sequenceModel), sequenceModel.STICKY_END_ANY);
  return _.reduce(aAs, (memo, aa, index) => {
    if(aa === 'X') {
      var level = RdpEdit.levels.WARN;
      var position = (index * 3) + 1;
      var message = `Early stop codon at base ${position}-${position+2}.`;
      var rdpEdit = new RdpEdit({type, message, level});
      memo.push(rdpEdit);
    }
    return memo;
  }, []);
};


var checkForFatalErrors = function(sequenceModel) {
  var fatalErrorFunctions = [
    [warnIfNotMultipleOf3,    RdpEdit.types.NOT_MULTIPLE_OF_3],
    [warnIfStickyEndsPresent, RdpEdit.types.STICKY_ENDS_PRESENT],
    [warnIfShortSequence,     RdpEdit.types.SEQUENCE_TOO_SHORT]
  ];

  var fatalErrorRdpEdits = [];
  _.each(fatalErrorFunctions, ([func, type]) => {
    var rdpEdit = func(sequenceModel, type);
    if(rdpEdit) {
      rdpEdit.level = RdpEdit.levels.ERROR;
      fatalErrorRdpEdits.push(rdpEdit);
    }
  });
  return fatalErrorRdpEdits;
};


var getTransformationFunctions = function(sequenceModel) {
  var partType = sequenceModel.get('partType');
  var transformationFunctions = [];
  if(partType === RdpTypes.types.CDS) {
    transformationFunctions = [
      methionineStartCodon,
      noTerminalStopCodons
    ];
  }

  var desiredStickyEnds = sequenceModel.get('desiredStickyEnds');
  var lastBaseMustBe;
  if(desiredStickyEnds && desiredStickyEnds.end && desiredStickyEnds.end.sequence) {
    lastBaseMustBe = desiredStickyEnds.end.sequence.substr(0, 1);
  }

  transformationFunctions.concat([
    ensureLastBaseIs(lastBaseMustBe),
    warnIfEarlyStopCodons
  ]);

  return transformationFunctions;
};


/**
 * @function  transformSequenceForRdp
 * @param  {SequenceModel}  sequenceModel
 * @return {Array<RdpEdit>}
 */
var transformSequenceForRdp = function(sequenceModel) {
  var fatalErrorRdpEdits = checkForFatalErrors(sequenceModel);
  // If there are any warnings (which would result in errors being thrown by the
  // transform functions) then return these straight away.
  if(fatalErrorRdpEdits.length) return fatalErrorRdpEdits;

  var transformationFunctions = getTransformationFunctions(sequenceModel);
  var rdpEdits = [];
  _.each(transformationFunctions, (transformation) => {
    var moreRdpEdits = transformation(sequenceModel);
    if(moreRdpEdits.length) rdpEdits = rdpEdits.concat(moreRdpEdits);
  });

  return rdpEdits;
};


export default {
  methionineStartCodon,
  noTerminalStopCodons,
  ensureLastBaseIs,
  transformSequenceForRdp,
};
