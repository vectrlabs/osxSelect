;(function ( $, window, document, undefined ) {

  var pluginName = 'osxSelect';

  // Defaults
  var defaults = {
    selectedClass : 'selected',
    multi: true,
    dragSelect: false,
    doingSelectClass : false,
    onSelectionChange: function() {}
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
    this.$element.on('mousedown', this.options.selector, $.proxy(this.mousedownItem, this));

    // Bind if option passed
    if(this.options.doingSelectClass) {
      $(window).on('keydown keyup', $.proxy(this.toggleMetaOrShift, this));
    }

    // Bind if options passed
    if(this.options.dragSelect) {
      this.$element.on('mousedown', $.proxy(this.dragSelect, this));
    }

    // instance vars
    this.shiftIndex     = 0;
    this.prevShiftIndex = 0;
    this.stopProp = {};
    this.$selection;
    this.$shiftRange;
  }

  /**
   * Drag a rectangle, and select all items that fall within the rectangle,
   * when you click & drag on the element.
   *
   * @param  {object} e $.Event Object
   */
  Plugin.prototype.dragSelect = function(e) {

    // Ignore if already mousedown'd a child, and only left clicks
    if( this.isBubble('mousedown') || e.which !== 1 ) {
      return;
    }

    var self      = this;
    var $window   = $(window);
    var $document = $(document);
    var $rect     = $('<div class="selection_rect" />');
    var offset    = self.$element.offset();
    var ox        = e.pageX + this.$element.scrollLeft() - offset.left;
    var oy        = e.pageY + this.$element.scrollTop() - offset.top;
    var $items    = this.$element.find(this.options.selector);
    var bounds    = {};
    var prevPageX = 0;
    var prevPageY = 0;

    $items.each(function(i, item) {
      var position = $(item).position();

      bounds[i] = {
        left   : position.left,
        top    : position.top,
        right  : position.left + item.offsetWidth,
        bottom :  position.top + item.offsetHeight
      };
    });

    // Append the rect
    $rect.css({
      position: 'absolute',
      left: ox - 5,
      top: oy - 5,
      width: 5,
      height: 5
    }).appendTo( this.$element );

    /**
     * Position the selection rect, and select/deselect
     * elements that are in/outside of the rect on any mousemove
     * or element scroll.
     *
     * @param {object} e $.Event Object
     */
    function setRect(e) {
      var pageX   = e.pageX || prevPageX;
      var pageY   = e.pageY || prevPageY;
      var x       = pageX + self.$element.scrollLeft() - offset.left;
      var y       = pageY+ self.$element.scrollTop() - offset.top;
      var width   = Math.abs(x - ox);
      var height  = Math.abs(y - oy);
      var left    = Math.min(ox, x);
      var top     = Math.min(oy, y);
      var rectBounds = {
        left : left,
        right : left + width,
        top : top,
        bottom : top + height
      };
      var $select   = $();
      var $deselect = $();

      // Set which items we're going to add/remove from selection
      // based on their intersection with the select box
      $.each(bounds, function(i, box) {
        if(intersectRect(bounds[i], rectBounds)) {
          $select = $select.add( $items.eq(i) );
        } else {
          $deselect = $deselect.add( $items.eq(i) );
        }
      });

      // Select/Deselect
      self.setSelection( $select, $deselect );

      // Set the rect
      $rect.css({ width : width, height: height, left : left, top : top });

      // Scroll events don't have page position, so
      // save any previous page positions in case we
      // need them for future use
      prevPageY = pageY;
      prevPageX = pageX;
    }

    /**
     * Check if two boxes intersect.
     *
     * @param  {object} r1 { left:0, top:0, right:0, bottom:0 }
     * @param  {object} r2
     * @return {boolean}    True if intersects
     */
    function intersectRect(r1, r2) {
      return !(r2.left > r1.right ||
               r2.right < r1.left ||
               r2.top > r1.bottom ||
               r2.bottom < r1.top);
    }

    // Bind events
    this.$element.on('scroll', setRect);
    $window.on('mousemove', setRect);

    // Unbind all events and remove rect on mouseup
    $window.one('mouseup', function unbindSetRect() {
      $rect.remove();
      $window.off('mousemove', setRect);
      self.$element.off('scroll', setRect);
    });
  }

  /**
   * Set/unset a class on the container when a person holds down the shift
   * key or the meta key. This can be useful if you want to disable hover
   * states while you're holding down one of these keys.
   *
   * @param  {object} e $.Event Object
   */
  Plugin.prototype.toggleMetaOrShift = function(e) {
    this.$element.toggleClass(this.options.doingSelectClass, e.shiftKey || e.metaKey)
  };

  /**
   * Define our selection on click: handles single clicks,
   * meta key clicks, shift key clicks.
   *
   * @param  {object} e jQuery Event Object
   * @return {undefined}
   */
  Plugin.prototype.mousedownItem = function(e) {

    // Only handle on first clicked
    if( this.isBubble('mousedown') ){
      return;
    }

    var $clicked    = $(e.currentTarget);
    var clickIndex  = $clicked.index(this.options.selector);

    // If meta or control click, add or remove clicked item from selection
    if(this.options.multi && (e.metaKey || e.ctrlKey) ) {

      // Deselect and remove from shiftrange if selected
      if( $clicked.hasClass(this.options.selectedClass) ) {
        this.setSelection(null, $clicked);

        // Remove from shiftRange, if necessary
        if(this.$shiftRange) {
          this.$shiftRange = this.$shiftRange.not( $clicked );
        }

        // If we unset our shiftIndex, set to 0
        if(this.shiftIndex === clickIndex) {
          this.shiftIndex = 0;
        }

      // Otherwise select it
      } else {
        this.setSelection($clicked);
        this.shiftIndex = clickIndex;
      }
    }

    // If shift click set a range of selection
    if(this.options.multi && e.shiftKey) {
      var selector = this.options.selector;
      var rangeMax = Math.max(this.shiftIndex, clickIndex);
      var rangeMin = Math.min(this.shiftIndex, clickIndex);

      // Get all items in the shift range
      var $newShiftRange = this.$element.find(selector).filter(function() {
        var index = $(this).index(selector);
        return index <= rangeMax && index >= rangeMin;
      });

      // Select the shiftrange
      if(this.$shiftRange) {
        var $select = $newShiftRange.not( this.$shiftRange );
        var $deselect;

        // If our shift index hasn't changed, we're flipping a shift
        // range from one side of the index to the other, so we'll
        // have to deselect the old items
        if(this.prevShiftIndex === this.shiftIndex) {
          $deselect = this.$shiftRange.not( $newShiftRange );
        }

        this.setSelection( $select, $deselect );

      } else {
        this.setSelection( $newShiftRange );
      }

      // Save shift range and previous shift
      // index for next time
      this.$shiftRange    = $newShiftRange;
      this.prevShiftIndex = this.shiftIndex;
    }

    // If just a normal click, set selection to only the clicked item
    if( !this.options.multi || (!e.ctrlKey && !e.metaKey && !e.shiftKey) ) {
      var $deselect = this.$element.find('.' + this.options.selectedClass).not( $clicked );
      var $select;

      if( !$clicked.hasClass(this.options.selectedClass) ) {
        $select = $clicked;
      }

      this.$shiftRange = $clicked;
      this.setSelection( $select, $deselect );
      this.shiftIndex = clickIndex;
    }
  };

  /**
   * Select/Deselect items and trigger a callback
   *
   * @param {object} $select   jQuery Selection
   * @param {object} $deselect jQuery Selection
   */
  Plugin.prototype.setSelection = function($select, $deselect) {
    // Select items
    if($select && $select.length) {
      $select.addClass(this.options.selectedClass);
    }

    // Deselect items
    if($deselect && $deselect.length) {
      $deselect.removeClass(this.options.selectedClass);
    }

    // Callback
    // this.options.onSelectionChange.call(self, self.getSelectedIndexes(), self.$sortSelection);
  };

  /**
   * Detect whether an event is bubbling (i.e. if it has
   * already been handled in our plugin). This lets us
   * stopPropgation within only our plugin.
   *
   * @param  {string}  eventName JS Event Name
   * @return {Boolean}           True if event is bubbling
   */
  Plugin.prototype.isBubble = function(eventName) {
    var self = this;

    if(self.stopProp[eventName] === true) {
      return true;
    }

    // Set the bubbling to true
    self.stopProp[eventName] = true;

    // Unset the bubble once we reach the window
    $(window).one(eventName, function() {
      self.stopProp[eventName] = false;
    });

    // Not bubbling on first call
    return false;
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
