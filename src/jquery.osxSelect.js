;(function ( $, window, document, undefined ) {

  var pluginName = 'osxSelect';

  // Defaults
  var defaults = {
    selectedClass : 'selected',
    minSelection  : Number.POSITIVE_INFINITY,
    multi: true
  };

  /**
   * Plugin constructor: sets instance vars and events.
   *
   * @param {object} element DOM Object
   * @param {object} options Plugin options
   */
  function Plugin( element, options ) {
    this.element  = element;
    this.$element = $(element);

    this.options = $.extend({}, defaults, options) ;

    this._defaults = defaults;
    this._name = pluginName;

    // bind the plugin's events
    this.$element.on('click', this.options.selector, $.proxy(this.clickItem, this));

    // instance vars
    this.shiftIndex = 0;
    this.$selection;
    this.$shiftRange;
    // this.$activeItem;
    // this.$items;
  }

  /**
   * Handle click events on a sortable item; this is used to define
   * our selection.
   *
   * @param  {object} e jQuery Event Object
   * @return {undefined}
   */
  Plugin.prototype.clickItem = function(e) {
    var $clicked    = $(e.target);
    var clickIndex  = $clicked.index();

    // If meta or control click, add or remove clicked item from selection
    if(this.options.multi && e.metaKey || e.ctrlKey) {

      if($clicked.hasClass(this.options.selectedClass)) {
        this.deselectItems( $clicked );

        // Remove from shiftRange, if necessary
        if(this.$shiftRange) {
          this.$shiftRange = this.$shiftRange.not( $clicked );
        }

        // If we unset our shiftIndex, set to 0
        if(this.shiftIndex === clickIndex) {
          this.shiftIndex = 0;
        }

      } else {
        this.selectItems( $clicked );
        this.shiftIndex = clickIndex;
      }
    }

    // If shift click, set (or reset) range of selection
    if(this.options.multi && e.shiftKey) {

      var prevSelector = this.options.selector + ':eq(' + this.shiftIndex + ')';
      var $newShiftRange;

      if(this.shiftIndex === clickIndex) {
        $newShiftRange = $clicked;
      } else if(this.shiftIndex < clickIndex) {
        $newShiftRange = $clicked.prevUntil(prevSelector).add( $clicked ).add(prevSelector);
      } else {
        $newShiftRange = $clicked.nextUntil(prevSelector).add( $clicked ).add(prevSelector);
      }

      if(this.$shiftRange) {
        this.selectItems( $newShiftRange.not( this.$shiftRange ) );
        this.deselectItems( this.$shiftRange.not( $newShiftRange ) );
      } else {
        this.selectItems( $newShiftRange );

      }

      this.$shiftRange = $newShiftRange;
    }

    // If normal click, set selection to only the clicked item
    if( !this.options.multi || (!e.ctrlKey && !e.metaKey && !e.shiftKey) ) {
      var $deselect = this.$element.find('.' + this.options.selectedClass).not( $clicked );

      if( !$clicked.hasClass(this.options.selectedClass) ) {
        this.selectItems( $clicked );
      }

      this.$shiftRange = $clicked;
      this.deselectItems( $deselect );
      this.shiftIndex = clickIndex;
    }

    // Callback
    this.setSelection();

    // TODO: Keep this...
    // this.options.onSelectionChange.call(this, this.getSelectedIndexes(), this.$selection);
  };

  /**
   * Get the indexes of everything that's selected
   *
   * @return {array} Indexes of selected items
   */
  Plugin.prototype.getSelectedIndexes = function() {
    var self      = this;
    var indexes   = [];

    this.$selection.each(function(i, el) {
      indexes.push( self.$element.find(self.options.selector).index(el) );
    });

    return indexes.sort();
  }

  /**
   * Set the jQuery Element that contains our sort selection
   */
  Plugin.prototype.setSelection = function() {
    this.$selection = this.$element.find('.' + this.options.selectedClass);
  }

  /**
   * Public version of selectItems with callback
   */
  Plugin.prototype.selectItems = function($el) {
    $el.addClass(this.options.selectedClass);

    // Callback
    this.setSelection();

    // TODO: Keep this...shouldn't this be called in setSelection though?
    // this.options.onSelectionChange.call(this, this.getSelectedIndexes(), this.$selection);
  };

  /**
   * Public version of deselectItems with callback
   */
  Plugin.prototype.deselectItems = function($el) {
    $el.removeClass(this.options.selectedClass);

    // Callback
    this.setSelection();

    // TODO: Keep this, but see previous comment
    // this.options.onSelectionChange.call(this, this.getSelectedIndexes(), this.$selection);
  };

  // Plugin Wrapper
  $.fn[pluginName] = function ( options ) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName,
        new Plugin( this, options ));
      }
    });
  }

})( jQuery, window, document );
