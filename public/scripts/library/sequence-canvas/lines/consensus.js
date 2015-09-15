import Line from './line';
import _ from 'underscore';

export default class Consensus extends Line {

  constructor(sequenceCanvas, options) {
    super(sequenceCanvas, options);
    this.dims = _.defaults(options, {
      baseWidth: 10,
      yOffset: 95,
    });

    this.consensusSettings = {
      'good': {
        height: 40,
        color: '#31A450',
      },

      'medium': {
        height: 30,
        color: '#F2EC00',
      },

      'bad': {
        height: 20,
        color: '#EF000F',
      },
      'none': {
        height: 0,
        color: '#FFF'
      }
    };


  }

  draw(x, y, baseRange, baseWidth) {
    var sequenceCanvas  = this.sequenceCanvas,
        ls              = sequenceCanvas.layoutSettings,
        lh              = sequenceCanvas.layoutHelpers,
        sequence        = sequenceCanvas.sequence,
        artist          = sequenceCanvas.artist,
        selection       = sequenceCanvas.selection,
        fragments       = sequence.get('chromatogramFragments'),
        k, subSequence, character;

    var _this = this,
        baseWidth = baseWidth || ls.basePairDims.width || this.dims.baseWidth,
        yOffset = this.height || this.dims.yOffset,
        consensus = fragments.getConsensus().slice(baseRange[0], baseRange[1] + 1),
        head = {
          type: getType(consensus[0]),
          position: 0
        };


    function drawRect(start, end, type){
      var setting = _this.consensusSettings[type]

      artist.rect(
        x + (start * baseWidth),
        y + yOffset - setting.height,
        (end - start) * baseWidth,
        setting.height,
        {
          fillStyle: setting.color
        }
      );
    }

    function getType(base){
      var type;

      if (_.contains(['A', 'C', 'G', 'T'], base)){
        return 'good';
      } else if (_.contains(['N'], base)){
        return 'medium';
      } else if (_.contains([' '], base)){
        return 'none';
      } else {
        return 'bad';
      }

    }

    _.forEach(consensus, function(base, i){

      if (head.type != getType(base) || (i == consensus.length - 1)){
        drawRect(head.position, i, head.type);
        head = {
          type: getType(base),
          position: i
        };
      }

      if (i == (consensus.length - 1)){
        drawRect(head.position, consensus.length, head.type);
      }


    });

  }

}
