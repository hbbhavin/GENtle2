import {stubCurrentUser} from '../../../common/tests/stubs';
import WipRdpPcrSequence from '../../../plugins/pcr/lib/wip_rdp_pcr_sequence';
import WipRdpOligoSequence from '../wip_rdp_oligo_sequence';
import RdpEdit from '../rdp_edit';
import RdpTypes from '../rdp_types';
import {
  stickyEndsXZ,
  stickyEndsZX,
} from './fixtures';

import {
  calculateTransformationFunctionInstances,
} from '../rdp_sequence_transform';


var initialSequenceContent = 'GTGTAG';

var sequenceAttributes = {
  name: 'Test sequence',
  sequence: initialSequenceContent,
  features: [{
    ranges: [{
      from: 7,
      to: 9
    }],
    name: 'test feature',
    desc: 'test feature description',
    type: 'gene'
  }],
};



var setSequence = function(bases, desiredStickyEnds=undefined, partType='CDS') {
  sequenceModel.set({
    sequence: bases,
    desiredStickyEnds,
    partType,
  });
};

var setOligoSequence = function(bases, desiredStickyEnds=undefined, partType='CDS') {
  oligoSequenceModel.set({
    sequence: bases,
    desiredStickyEnds,
    partType,
  });
};


var getSequence = function() {
  return sequenceModel.getSequence(sequenceModel.STICKY_END_FULL);
};

var getOligoSequence = function() {
  return oligoSequenceModel.getSequence(oligoSequenceModel.STICKY_END_FULL);
};


var sequenceModel, oligoSequenceModel;


describe('RDP sequence transforms', function() {
  beforeAll(function() {
    stubCurrentUser();
  });

  beforeEach(function() {
    sequenceAttributes.partType = RdpTypes.types.CDS;
    sequenceModel = new WipRdpPcrSequence(sequenceAttributes);
    sequenceAttributes.partType = RdpTypes.types.PROMOTER;
    oligoSequenceModel = new WipRdpOligoSequence(sequenceAttributes);

    ([
      sequenceModel,
      oligoSequenceModel,
    ]).forEach(function(_sequenceModel) {
      spyOn(_sequenceModel, 'save');
      spyOn(_sequenceModel, 'throttledSave');
    });
  });


  describe('calculateTransformationFunctionInstances', function() {
    describe('for RDP PCR', function() {
      it("Fusion Protein CDS X-Z'", function() {
        setSequence('AAT', stickyEndsXZ(), RdpTypes.types.CDS);
        var transforms = calculateTransformationFunctionInstances(sequenceModel);
        expect(transforms.length).toEqual(4);
        expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.METHIONINE_START_CODON);
        expect(transforms[1].rdpEditType).toEqual(RdpEdit.types.LAST_STOP_CODONS_REMOVED);
        expect(transforms[2].rdpEditType).toEqual(RdpEdit.types.LAST_BASE_IS_C);
        expect(transforms[3].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("CDS with STOP X-Z'", function() {
        setSequence('AATTGA', stickyEndsXZ(), RdpTypes.types.CDS_WITH_STOP);
        var transforms = calculateTransformationFunctionInstances(sequenceModel);
        expect(transforms.length).toEqual(3);
        expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.METHIONINE_START_CODON);
        expect(transforms[1].rdpEditType).toEqual(RdpEdit.types.LAST_CODON_IS_STOP);
        expect(transforms[2].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Modifier X-Z'", function() {
        setSequence('AAT', stickyEndsXZ(), RdpTypes.types.MODIFIER);
        var transforms = calculateTransformationFunctionInstances(sequenceModel);
        expect(transforms.length).toEqual(4);
        expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.METHIONINE_START_CODON);
        expect(transforms[1].rdpEditType).toEqual(RdpEdit.types.LAST_STOP_CODONS_REMOVED);
        expect(transforms[2].rdpEditType).toEqual(RdpEdit.types.LAST_BASE_IS_C);
        expect(transforms[3].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Modifier Z-X'", function() {
        setSequence('AAT', stickyEndsZX(), RdpTypes.types.MODIFIER);
        var transforms = calculateTransformationFunctionInstances(sequenceModel);
        expect(transforms.length).toEqual(3);
        expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.LAST_STOP_CODONS_REMOVED);
        expect(transforms[1].rdpEditType).toEqual(RdpEdit.types.LAST_BASE_IS_G);
        expect(transforms[2].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Other X-Z'", function() {
        setSequence('AAT', stickyEndsXZ(), RdpTypes.types.OTHER);
        var transforms = calculateTransformationFunctionInstances(sequenceModel);
        expect(transforms.length).toEqual(0);
        // expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Other Z-X'", function() {
        setSequence('AAT', stickyEndsZX(), RdpTypes.types.OTHER);
        var transforms = calculateTransformationFunctionInstances(sequenceModel);
        expect(transforms.length).toEqual(0);
        // expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });
    });


    describe('for RDP oligo', function() {
      it("RBS Z-X'", function() {
        setOligoSequence('AAT', stickyEndsZX(), RdpTypes.types.RBS);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(1);
        expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.FIRST_CODON_IS_STOP);
      });

      it("Terminator Z-X'", function() {
        setOligoSequence('AAT', stickyEndsZX(), RdpTypes.types.TERMINATOR);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(1);
        expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.FIRST_CODON_IS_STOP);
      });

      it("Modifier X-Z'", function() {
        setOligoSequence('AAT', stickyEndsXZ(), RdpTypes.types.MODIFIER);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(4);
        expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.METHIONINE_START_CODON);
        expect(transforms[1].rdpEditType).toEqual(RdpEdit.types.LAST_STOP_CODONS_REMOVED);
        expect(transforms[2].rdpEditType).toEqual(RdpEdit.types.LAST_BASE_IS_C);
        expect(transforms[3].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Modifier Z-X'", function() {
        setOligoSequence('AAT', stickyEndsZX(), RdpTypes.types.MODIFIER);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(3);
        expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.LAST_STOP_CODONS_REMOVED);
        expect(transforms[1].rdpEditType).toEqual(RdpEdit.types.LAST_BASE_IS_G);
        expect(transforms[2].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Protein linker Z-X'", function() {
        setOligoSequence('AAT', stickyEndsZX(), RdpTypes.types.PROTEIN_LINKER);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(3);
        expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.LAST_STOP_CODONS_REMOVED);
        expect(transforms[1].rdpEditType).toEqual(RdpEdit.types.LAST_BASE_IS_G);
        expect(transforms[2].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Promoter X-Z'", function() {
        setOligoSequence('AAT', stickyEndsXZ(), RdpTypes.types.PROMOTER);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(0);
        // expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Promoter Z-X'", function() {
        setOligoSequence('AAT', stickyEndsZX(), RdpTypes.types.PROMOTER);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(0);
        // expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Operator X-Z'", function() {
        setOligoSequence('AAT', stickyEndsXZ(), RdpTypes.types.OPERATOR);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(0);
        // expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Operator Z-X'", function() {
        setOligoSequence('AAT', stickyEndsZX(), RdpTypes.types.OPERATOR);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(0);
        // expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Other X-Z'", function() {
        setOligoSequence('AAT', stickyEndsXZ(), RdpTypes.types.OTHER);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(0);
        // expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });

      it("Other Z-X'", function() {
        setOligoSequence('AAT', stickyEndsZX(), RdpTypes.types.OTHER);
        var transforms = calculateTransformationFunctionInstances(oligoSequenceModel);
        expect(transforms.length).toEqual(0);
        // expect(transforms[0].rdpEditType).toEqual(RdpEdit.types.EARLY_STOP_CODON);
      });
    });
  });


  describe('all RDP sequence validation and transformation', function() {
    describe('invalid sequence', function() {
      it('should throw an error if no desiredStickyEnds are present', function() {
        setSequence('ATGAAC', undefined, RdpTypes.types.CDS);
        expect(function() {
          sequenceModel.transformSequenceForRdp();
        }).toThrowError(TypeError, 'Must provide "desiredStickyEnds"');
      });

      it('should throw an error if last base is unsupported', function() {
        var desiredStickyEnds = stickyEndsXZ();
        desiredStickyEnds.end.sequence = 'T';
        desiredStickyEnds.end.offset = 0;
        desiredStickyEnds.end.size = 1;
        setSequence('ATGAAT', desiredStickyEnds, RdpTypes.types.CDS);
        expect(function() {
          sequenceModel.transformSequenceForRdp();
        }).toThrowError(TypeError, 'ensureLastBaseIs does not yet support base of: "T"');
      });

      describe('PCR sequence', function() {
        it('should throw an error if an invalid desiredStickyEnd is provided', function() {
          setSequence('ATGAAC', stickyEndsZX(), RdpTypes.types.CDS);
          expect(function() {
            sequenceModel.transformSequenceForRdp();
          }).toThrowError(TypeError, 'Invalid desiredStickyEnd: "Z-X\'"');
        });

        it('should throw an error if an invalid partType is provided', function() {
          setSequence('ATGAAC', stickyEndsXZ(), RdpTypes.types.PROTEIN_LINKER);
          expect(function() {
            sequenceModel.transformSequenceForRdp();
          }).toThrowError(TypeError, 'Invalid partType: "PROTEIN_LINKER"');
        });
      });

      describe('oligo sequence', function() {
        it('should throw an error if an invalid desiredStickyEnd is provided', function() {
          setOligoSequence('ATGAAC', stickyEndsXZ(), RdpTypes.types.PROTEIN_LINKER);
          expect(function() {
            oligoSequenceModel.transformSequenceForRdp();
          }).toThrowError(TypeError, 'Invalid desiredStickyEnd: "X-Z\'"');
        });

        it('should throw an error if an invalid partType is provided', function() {
          setOligoSequence('ATGAAC', stickyEndsXZ(), RdpTypes.types.CDS);
          expect(function() {
            oligoSequenceModel.transformSequenceForRdp();
          }).toThrowError(TypeError, 'Invalid partType: "CDS"');
        });
      });
    });


    describe('sequence impossible to make RDP compliant', function() {
      it('should error if length is not a multiple of 3 and sequence is too short', function() {
        setSequence('AC', stickyEndsXZ());
        var rdpEdits = sequenceModel.transformSequenceForRdp();
        expect(rdpEdits.length).toEqual(2);
        expect(rdpEdits[0].type).toEqual(RdpEdit.types.SEQUENCE_TOO_SHORT);
        expect(rdpEdits[0].level).toEqual(RdpEdit.levels.ERROR);
        expect(rdpEdits[1].type).toEqual(RdpEdit.types.NOT_MULTIPLE_OF_3);
        expect(rdpEdits[1].level).toEqual(RdpEdit.levels.ERROR);

        expect(getSequence()).toEqual('AC');
      });

      it('should error if stickyEnds are present', function() {
        var stickyEndz = stickyEndsXZ();
        var finalSequence = stickyEndz.start.sequence + 'ATAC' + stickyEndz.end.sequence;
        setSequence(finalSequence, stickyEndsXZ());
        sequenceModel.set({stickyEnds: stickyEndz});

        var rdpEdits = sequenceModel.transformSequenceForRdp();
        expect(rdpEdits.length).toEqual(1);
        expect(rdpEdits[0].type).toEqual(RdpEdit.types.STICKY_ENDS_PRESENT);
        expect(rdpEdits[0].level).toEqual(RdpEdit.levels.ERROR);

        expect(getSequence()).toEqual(finalSequence);
      });
    });


    describe('sequence possible to make RDP compliant', function() {
      it('if no transformations to make', function() {
        setSequence('ATGAAC', stickyEndsXZ());
        var rdpEdits = sequenceModel.transformSequenceForRdp();
        expect(rdpEdits.length).toEqual(0);

        expect(getSequence()).toEqual('ATGAAC');
      });

      it('should transform all', function() {
        const LYSINE1 = 'AAA';
        const ARGININE = 'CGC';
        setSequence('GTGTAG' + LYSINE1, stickyEndsXZ());
        var rdpEdits = sequenceModel.transformSequenceForRdp();
        expect(rdpEdits.length).toEqual(3);
        expect(rdpEdits[0].type).toEqual(RdpEdit.types.METHIONINE_START_CODON_CONVERTED);
        expect(rdpEdits[0].level).toEqual(RdpEdit.levels.NORMAL);
        expect(rdpEdits[1].type).toEqual(RdpEdit.types.LAST_BASE_IS_C);
        expect(rdpEdits[1].level).toEqual(RdpEdit.levels.NORMAL);
        expect(rdpEdits[2].type).toEqual(RdpEdit.types.EARLY_STOP_CODON);
        expect(rdpEdits[2].level).toEqual(RdpEdit.levels.WARN);

        expect(getSequence()).toEqual('ATGTAG' + ARGININE);
      });

      it('should transform all 2', function() {
        setSequence('ACCTGTTTTAAAAAT', stickyEndsXZ());
        var rdpEdits = sequenceModel.transformSequenceForRdp();
        expect(rdpEdits.length).toEqual(2);
        expect(rdpEdits[0].type).toEqual(RdpEdit.types.METHIONINE_START_CODON_ADDED);
        expect(rdpEdits[0].level).toEqual(RdpEdit.levels.NORMAL);
        expect(rdpEdits[1].type).toEqual(RdpEdit.types.LAST_BASE_IS_C_NO_AA_CHANGE);
        expect(rdpEdits[1].level).toEqual(RdpEdit.levels.NORMAL);

        expect(getSequence()).toEqual('ATGACCTGTTTTAAAAAC');
      });

      it('should transform CDS_WITH_STOP with multiple stops', function() {
        setSequence('CCCTGACCCTGATGA', stickyEndsXZ(), RdpTypes.types.CDS_WITH_STOP);
        var rdpEdits = sequenceModel.transformSequenceForRdp();
        expect(rdpEdits.length).toEqual(2);
        expect(rdpEdits[0].type).toEqual(RdpEdit.types.METHIONINE_START_CODON_ADDED);
        expect(rdpEdits[0].level).toEqual(RdpEdit.levels.NORMAL);
        expect(rdpEdits[1].type).toEqual(RdpEdit.types.EARLY_STOP_CODON);
        expect(rdpEdits[1].level).toEqual(RdpEdit.levels.WARN);

        expect(getSequence()).toEqual('ATGCCCTGACCCTGATGA');
      });

      it('should transform CDS_WITH_STOP with no STOP codon as last codon', function() {
        setSequence('CCCTGACCC', stickyEndsXZ(), RdpTypes.types.CDS_WITH_STOP);
        var rdpEdits = sequenceModel.transformSequenceForRdp();
        expect(rdpEdits.length).toEqual(3);
        expect(rdpEdits[0].type).toEqual(RdpEdit.types.METHIONINE_START_CODON_ADDED);
        expect(rdpEdits[0].level).toEqual(RdpEdit.levels.NORMAL);
        expect(rdpEdits[1].type).toEqual(RdpEdit.types.LAST_CODON_IS_STOP_ADDED);
        expect(rdpEdits[1].level).toEqual(RdpEdit.levels.NORMAL);
        expect(rdpEdits[2].type).toEqual(RdpEdit.types.EARLY_STOP_CODON);
        expect(rdpEdits[2].level).toEqual(RdpEdit.levels.WARN);

        expect(getSequence()).toEqual('ATGCCCTGACCCTAG');
      });

      it('should transform oligo', function() {
        setOligoSequence('GTGTAGAAATAG', stickyEndsZX(), RdpTypes.types.PROTEIN_LINKER);
        var rdpEdits = oligoSequenceModel.transformSequenceForRdp();
        expect(rdpEdits.length).toEqual(3);
        expect(rdpEdits[0].type).toEqual(RdpEdit.types.LAST_STOP_CODONS_REMOVED);
        expect(rdpEdits[0].level).toEqual(RdpEdit.levels.NORMAL);
        expect(rdpEdits[1].type).toEqual(RdpEdit.types.LAST_BASE_IS_G_NO_AA_CHANGE);
        expect(rdpEdits[1].level).toEqual(RdpEdit.levels.NORMAL);
        expect(rdpEdits[2].type).toEqual(RdpEdit.types.EARLY_STOP_CODON);
        expect(rdpEdits[2].level).toEqual(RdpEdit.levels.WARN);

        expect(getOligoSequence()).toEqual('GTGTAGAAG');
      });
    });
  });
});
