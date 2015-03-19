import template from '../templates/pcr_list_view.hbs';
import {fastAExportSequenceFromID} from '../../../common/lib/utils';
import Gentle from 'gentle';


export default Backbone.View.extend({
  manage: true,
  template: template,
  className: 'pcr-product',

  events: {
    'click .show-pcr-product': 'showPcrProduct',
    'click .panel-title': 'showPcrProduct',
    'click .delete-pcr-product': 'deletePcrProduct',
    'click .open-pcr-product': 'openPcrProduct',
    'click .export-sequence': 'exportSequence',
  },

  serialize: function() {
    return {
      products: this.getProducts(),
    };
  },

  showProduct: function(product) {
    this.showingProduct = product;
  },

  afterRender: function() {
    var showingProduct = this.showingProduct;
    if(showingProduct) {
      this.$(`[data-product_id="${showingProduct.id}"]`).addClass('panel-info');
      this.scrollToProduct(showingProduct.id);
      this.parentView().showCanvas(showingProduct, false);
    }

    this.$('.has-tooltip').tooltip({
      container: 'body'
    });
  },

  getProducts: function() {
    return this.parentView().getProducts();
  },

  getProduct: function(event) {
    var products = this.getProducts();
    var product = $(event.target).closest('.panel').data('product_id');
    event.preventDefault();
    return _.find(products, {id: product});
  },

  showPcrProduct: function(event) {
    var product = this.getProduct(event);
    if(product) {
      this.parentView().showCanvas(product);
    }
  },

  deletePcrProduct: function(event) {
    var product = this.getProduct(event);
    if(product) {
      this.parentView().deleteProduct(product);
    }
  },

  openPcrProduct: function(event) {
    var product = this.getProduct(event);
    if(product) {
      var sequence = this.parentView().getSequenceFromProduct(product);
      Gentle.addSequencesAndNavigate([sequence]);
    }
  },

  exportSequence: function(event) {
    var sequenceID = $(event.target).data('sequence_id');
    var products = this.getProducts();
    fastAExportSequenceFromID(products, sequenceID);
  },

  scrollToProduct: function(productId) {
    var $container = this.$('#pcr-list-outer-container');
    var $target = this.$('[data-product_id="' + productId + '"]');
    $container.scrollTop($target.offset().top);
  },

});