/* globals jQuery */

// import detectPrefixes from './utils/detect-prefixes.js';
// import supportsPassive from './utils/detect-supportsPassive';
// import dispatchEvent from './utils/dispatch-event.js';
// import defaults from './defaults.js';

var JumpSlider = (function() {

  var slice = Array.prototype.slice;

  /**
   * Detecting prefixes for saving time and bytes
   */
  function detectPrefixes() {
    var transform = void 0;
    var transition = void 0;
    var transitionEnd = void 0;

    (function () {
      var el = document.createElement('_');
      var style = el.style;

      var prop = void 0;

      if (style[prop = 'webkitTransition'] === '') {
        transitionEnd = 'webkitTransitionEnd';
        transition = prop;
      }

      if (style[prop = 'transition'] === '') {
        transitionEnd = 'transitionend';
        transition = prop;
      }

      if (style[prop = 'webkitTransform'] === '') {
        transform = prop;
      }

      if (style[prop = 'msTransform'] === '') {
        transform = prop;
      }

      if (style[prop = 'transform'] === '') {
        transform = prop;
      }

      document.body.insertBefore(el, null);
      style[transform] = 'translateX(0)';
      document.body.removeChild(el);
    })();

    return {
      transform: transform,
      transition: transition,
      transitionEnd: transitionEnd
    };
  }

  function supportsPassive() {
    var supportsIt = false;

    try {
      var opts = Object.defineProperty({}, 'passive', {
        get: function get() {
          supportsIt = true;
        }
      });

      window.addEventListener('testPassive', null, opts);
      window.removeEventListener('testPassive', null, opts);
    } catch (e) {}

    return supportsIt;
  }

  var CustomEvent = (function() {
    var NativeCustomEvent = window.CustomEvent;

    function useNative() {
      try {
        var p = new NativeCustomEvent('cat', { detail: { foo: 'bar' } });
        return  'cat' === p.type && 'bar' === p.detail.foo;
      } catch (e) { }
      return false;
    }

    return useNative() ? NativeCustomEvent :

    // IE >= 9
    'undefined' !== typeof document && 'function' === typeof document.createEvent ? function CustomEvent (type, params) {
      var e = document.createEvent('CustomEvent');
      if (params) {
        e.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
      } else {
        e.initCustomEvent(type, false, false, void 0);
      }
      return e;
    } :

    // IE <= 8
    function CustomEvent (type, params) {
      var e = document.createEventObject();
      e.type = type;
      if (params) {
        e.bubbles = Boolean(params.bubbles);
        e.cancelable = Boolean(params.cancelable);
        e.detail = params.detail;
      } else {
        e.bubbles = false;
        e.cancelable = false;
        e.detail = void 0;
      }
      return e;
    }
  })()

  function dispatchEvent(target, type, detail) {
    var event = new CustomEvent(type, {
        bubbles: true,
        cancelable: true,
        detail: detail
    });

    target.dispatchEvent(event);
  }

  var defaults = {
    /**
     * slides scrolled at once
     * @slidesToScroll {Number}
     */
    slidesToScroll: 1,

    /**
     * time in milliseconds for the animation of a valid slide attempt
     * @slideSpeed {Number}
     */
    slideSpeed: 300,

    /**
     * time in milliseconds for the animation of the rewind after the last slide
     * @rewindSpeed {Number}
     */
    rewindSpeed: 600,

    /**
     * time for the snapBack of the slider if the slide attempt was not valid
     * @snapBackSpeed {Number}
     */
    snapBackSpeed: 200,

    /**
     * Basic easing functions: https://developer.mozilla.org/de/docs/Web/CSS/transition-timing-function
     * cubic bezier easing functions: http://easings.net/de
     * @ease {String}
     */
    ease: 'ease',

    /**
     * if slider reached the last slide, with next click the slider goes back to the startindex.
     * use infinite or rewind, not both
     * @rewind {Boolean}
     */
    rewind: false,

    /**
     * number of visible slides or false
     * use infinite or rewind, not both
     * @infinite {number}
     */
    infinite: false,

    /**
     * the slide index to show when the slider is initialized.
     * @initialIndex {number}
     */
    initialIndex: 0,

    /**
     * class name for slider frame
     * @classNameFrame {string}
     */
    classNameFrame: 'js_frame',

    /**
     * class name for slides container
     * @classNameSlideContainer {string}
     */
    classNameSlideContainer: 'js_slides',

    /**
     * class name for slider prev control
     * @classNamePrevCtrl {string}
     */
    classNamePrevCtrl: 'js_prev',

    /**
     * class name for slider next control
     * @classNameNextCtrl {string}
     */
    classNameNextCtrl: 'js_next',

    /**
     * class name for current active slide
     * if emptyString then no class is set
     * @classNameActiveSlide {string}
     */
    classNameActiveSlide: 'active',

    /**
     * enables mouse events for swiping on desktop devices
     * @enableMouseEvents {boolean}
     */
    enableMouseEvents: false,

    /**
     * window instance
     * @window {object}
     */
    window: typeof window !== 'undefined' ? window : null,

    /**
     * If false, slides lory to the first slide on window resize.
     * @rewindOnResize {boolean}
     */
    rewindOnResize: true
  }

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };

  return function JumpSlider(slider, opts) {
      var position;
      var slideWidth;
      var frameWidth;
      var slides;
      var resetting;

      /**
       * slider DOM elements
       */
      var frame;
      var slideContainer;
      var prevCtrl;
      var nextCtrl;
      var prefixes;
      var transitionEndCallback;

      var index   = 0;
      var options = _extend(defaults, opts);
      var touchEventParams = supportsPassive() ? { passive: true } : false;

      /**
       * if object is jQuery convert to native DOM element
       */
      if (typeof jQuery !== 'undefined' && slider instanceof jQuery) {
          slider = slider[0];
      }

      function setIndex(num) {
        // console.log('setting index from', index, num);
        index = num;
      }

      /**
       * private
       * set active class to element which is the current slide
       */
      function setActiveElement (slides, currentIndex) {
          var className = options.classNameActiveSlide;

          slides.forEach(function(element, index) {
              // if (element.classList.contains(className)) {
                  element.classList.remove(className);
              // }
          });

          slides[currentIndex].classList.add(className);
      }

      /**
       * private
       * setupInfinite: function to setup if infinite is set
       *
       * @param  {array} slideArray
       * @return {array} array of updated slideContainer elements
       */
      function setupInfinite (slideArray) {
          var infinite = options.infinite;
          var front = slideArray.slice(0, infinite);
          var back  = slideArray.slice(slideArray.length - infinite, slideArray.length);

          front.forEach(function(element) {
              var cloned = element.cloneNode(true);
              slideContainer.appendChild(cloned);
          });

          back.reverse().forEach(function (element) {
              var cloned = element.cloneNode(true);
              slideContainer.insertBefore(cloned, slideContainer.firstChild);
          });

          slideContainer.addEventListener(prefixes.transitionEnd, onTransitionEnd);
          return slice.call(slideContainer.children);
      }

      /**
       * [dispatchSliderEvent description]
       * @return {[type]} [description]
       */
      function dispatchSliderEvent (phase, type, detail) {
          dispatchEvent(slider,  phase + '.lory.' + type, detail);
      }

      /**
       * translates to a given position in a given time in milliseconds
       *
       * @to        {number} number in pixels where to translate to
       * @duration  {number} time in milliseconds for the transistion
       * @ease      {string} easing css property
       */
      function translate (to, duration, ease) {
          var style = slideContainer && slideContainer.style;

          if (style) {
              style[prefixes.transition + 'TimingFunction'] = ease;
              style[prefixes.transition + 'Duration'] = duration + 'ms';
              // style[prefixes.transform] = 'translateX(' + to + 'px)';
              style[prefixes.transform] = 'translate3d(' + to + 'px, 0, 0)';
          }
      }

      function getPixelValue(style, prop) {
        return parseInt((style[prop] || '0').replace('px', ''));
      }

      /**
       * returns an element's width
       */
      function elementWidth(element, withMargin) {
          var w = element.getBoundingClientRect().width || element.offsetWidth;
          if (withMargin) {
            var style = element.currentStyle || window.getComputedStyle(element);
            w += getPixelValue(style, 'marginLeft') + getPixelValue(style, 'marginRight');
          }
          return w;
      }


      /**
       * slidefunction called by prev, next & touchend
       *
       * determine nextIndex and slide to next postion
       * under restrictions of the defined options
       *
       * @direction  {boolean}
       */
      function slide (nextIndex, direction) {
          var infinite = options.infinite;
          var duration = options.slideSpeed;
          var disabledClassName = options.classNameDisabled || 'disabled';

          var nextSlide = direction ? index + 1 : index - 1;
          var perPage = Math.floor(frameWidth / slideWidth);

          dispatchSliderEvent('before', 'slide', {
              index: index,
              nextSlide: nextSlide
          });

          /**
           * Reset control classes
           */
          if (prevCtrl) {
              prevCtrl.classList.remove(disabledClassName);
          }
          if (nextCtrl) {
              nextCtrl.classList.remove(disabledClassName);
          }

          if (typeof nextIndex !== 'number') {
              if (direction) {
                if (infinite && index + (infinite * 2) !== slides.length) {
                    nextIndex = index + (infinite - index % infinite);
                } else {
                    nextIndex = index + options.slidesToScroll;
                }
              } else {
                if (infinite && index % infinite !== 0) {
                    nextIndex = index - index % infinite;
                } else {
                    nextIndex = index - options.slidesToScroll;
                }
              }
          }

          nextIndex = Math.min(Math.max(nextIndex, 0), slides.length - perPage);

          if (infinite && direction === undefined) {
              nextIndex += infinite;
          }

          if (options.rewindPrev && Math.abs(position.x) === 0 && direction === false) {
              nextIndex = slides.length - 1;
              duration = options.rewindSpeed;
          }

          if (!slides[nextIndex])
            return console.warn('Slide not found', nextIndex)

          // var nextOffset = Math.min(Math.max(slides[nextIndex].offsetLeft * -1, maxOffset * -1), 0);
          var nextOffset = slides[nextIndex].offsetLeft * -1;

          if (options.rewind && Math.abs(position.x) === maxOffset && direction) {
              nextOffset = 0;
              nextIndex = 0;
              duration = options.rewindSpeed;
          }

          /**
           * translate to the nextOffset by a defined duration and ease function
           */
          translate(nextOffset, duration, options.ease);

          /**
           * update the position with the next position
           */
          position.x = nextOffset;

          /**
           * update the index with the nextIndex only if
           * the offset of the nextIndex is in the range of the maxOffset
           */
          // if (slides[nextIndex].offsetLeft <= maxOffset) {
          // if (!direction || slides[nextIndex].offsetLeft <= maxOffset) {
          if (!direction || nextIndex <= slides.length) {
            setIndex(nextIndex);
          }

          if (infinite && (nextIndex === slides.length - infinite ||
              nextIndex === slides.length - slides.length % infinite || nextIndex === 0)) {
              if (direction) {
                  setIndex(infinite);
              }

              if (!direction) {
                  setIndex(slides.length - (infinite * 2));
              }

              position.x = slides[index].offsetLeft * -1;

              transitionEndCallback = function() {
                  translate(slides[index].offsetLeft * -1, 0, undefined);
              };
          }

          if (options.classNameActiveSlide) {
              setActiveElement(slice.call(slides), index);
          }

          /**
           * update classes for next and prev arrows
           * based on user settings
           */
          if (prevCtrl && !infinite && !options.rewindPrev && nextIndex === 0) {
              prevCtrl.classList.add(disabledClassName);
          }

          if (nextCtrl && !infinite && !options.rewind && nextIndex + 1 === slides.length) {
              nextCtrl.classList.add(disabledClassName);
          }

          dispatchSliderEvent('after', 'slide', {
              currentSlide: index
          });
      }

      function onImagesLoaded(images, cb) {
        var count = images.length;

        function done(ev) {
          --count || cb();
        }

        [].forEach.call(images, function(img) {
          if (img.complete) {
            done();
          } else {
            img.addEventListener('error', done, false);
            img.addEventListener('load', done, false);
          }
        });
      }

      /**
       * public
       * setup function
       */
      function setup () {
          dispatchSliderEvent('before', 'init');

          prefixes = detectPrefixes();

          var disabledClassName = options.classNameDisabled || 'disabled';

          setIndex(options.initialIndex);
          frame = slider.getElementsByClassName(options.classNameFrame)[0];
          slideContainer = frame.getElementsByClassName(options.classNameSlideContainer)[0];
          prevCtrl = slider.getElementsByClassName(options.classNamePrevCtrl)[0];
          nextCtrl = slider.getElementsByClassName(options.classNameNextCtrl)[0];

          position = {
              x: slideContainer.offsetLeft,
              y: slideContainer.offsetTop
          };

          if (options.infinite) {
              slides = setupInfinite(slice.call(slideContainer.children));
          } else {
              slides = slice.call(slideContainer.children);

              if (prevCtrl && !options.rewindPrev) {
                  prevCtrl.classList.add(disabledClassName);
              }

              if (nextCtrl && slides.length === 1 && !options.rewind) {
                  nextCtrl.classList.add(disabledClassName);
              }
          }

          var images = slideContainer.getElementsByTagName('IMG');
          onImagesLoaded(images, function() {
              reset();

              if (options.classNameActiveSlide) {
                  setActiveElement(slides, index);
              }

              if (prevCtrl && nextCtrl) {
                  prevCtrl.addEventListener('click', prev);
                  nextCtrl.addEventListener('click', next);
              }

              frame.addEventListener('touchstart', onTouchstart, touchEventParams);

              if (options.enableMouseEvents) {
                  frame.addEventListener('mousedown', onTouchstart);
                  frame.addEventListener('click', onClick);
              }

              options.window.addEventListener('resize', onResize);

              dispatchSliderEvent('after', 'init');
          });
      }

      /**
       * public
       * reset function: called on resize
       */
      function reset () {
          if (resetting) return; // console.log('resetting');
          resetting = true;
          frameWidth = elementWidth(frame);

          if (options.slideWidth) {
            slideWidth = options.slideWidth;
          } else {
            var checkSlide = slides[index] || slides[0],
                checkWidth = elementWidth(checkSlide, true);

            // TODO: get slide position, but only if within bounds
            // if (position.x <= checkSlide.offsetLeft) {
            //   console.log(index, position, checkSlide.offsetLeft, checkSlide);
            // } else {
            //   console.log('out of bounds');
            // }

            if (checkWidth > 0) slideWidth = checkWidth;
          }

          if (options.rewindOnResize) {
              setIndex(options.initialIndex);
          // } else {
          //     ease = null;
          //     rewindSpeed = 0;
          }

          // just call slide() so me make sure to have the same behaviour
          slide(index);
          setTimeout(function() {
            resetting = false;
          }, 100);

  /*
          if (infinite) {
              translate(slides[index + infinite].offsetLeft * -1, 0, null);

              index = index + infinite;
              position.x = slides[index].offsetLeft * -1;
          } else {
              translate(slides[index].offsetLeft * -1, rewindSpeed, ease);
              position.x = slides[index].offsetLeft * -1;
          }

          if (classNameActiveSlide) {
              setActiveElement(slice.call(slides), index);
          }
  */

      }

      /**
       * public
       * slideTo: called on clickhandler
       */
      function slideTo (index) {
          slide(index);
      }

      /**
       * public
       * returnIndex function: called on clickhandler
       */
      function returnIndex () {
          return index - options.infinite || 0;
      }

      /**
       * public
       * prev function: called on clickhandler
       */
      function prev () {
          slide(false, false);
      }

      /**
       * public
       * next function: called on clickhandler
       */
      function next () {
          slide(false, true);
      }

      /**
       * public
       * destroy function: called to gracefully destroy the lory instance
       */
      function destroy () {
          dispatchSliderEvent('before', 'destroy');

          // remove event listeners
          frame.removeEventListener(prefixes.transitionEnd, onTransitionEnd);
          frame.removeEventListener('touchstart', onTouchstart, touchEventParams);
          frame.removeEventListener('touchmove', onTouchmove, touchEventParams);
          frame.removeEventListener('touchend', onTouchend);
          frame.removeEventListener('mousemove', onTouchmove);
          frame.removeEventListener('mousedown', onTouchstart);
          frame.removeEventListener('mouseup', onTouchend);
          frame.removeEventListener('mouseleave', onTouchend);
          frame.removeEventListener('click', onClick);

          options.window.removeEventListener('resize', onResize);

          if (prevCtrl) {
              prevCtrl.removeEventListener('click', prev);
          }

          if (nextCtrl) {
              nextCtrl.removeEventListener('click', next);
          }

          // remove cloned slides if infinite is set
          if (options.infinite) {
              Array.apply(null, Array(options.infinite)).forEach(function () {
                  slideContainer.removeChild(slideContainer.firstChild);
                  slideContainer.removeChild(slideContainer.lastChild);
              });
          }

          dispatchSliderEvent('after', 'destroy');
      }

      // event handling

      var touchOffset;
      var delta;
      var isScrolling;

      function onTransitionEnd () {
          if (transitionEndCallback) {
              transitionEndCallback();
              transitionEndCallback = undefined;
          }
      }

      function onTouchstart (event) {
          var touches = event.touches ? event.touches[0] : event;

          if (options.enableMouseEvents) {
              frame.addEventListener('mousemove', onTouchmove);
              frame.addEventListener('mouseup', onTouchend);
              frame.addEventListener('mouseleave', onTouchend);
          }

          frame.addEventListener('touchmove', onTouchmove, touchEventParams);
          frame.addEventListener('touchend', onTouchend);

          touchOffset = {
              x: touches.pageX,
              y: touches.pageY,
              time: Date.now()
          };

          isScrolling = undefined;

          delta = {};

          dispatchSliderEvent('on', 'touchstart', {
              event: event
          });
      }

      function onTouchmove (event) {
          var touches = event.touches ? event.touches[0] : event;

          delta = {
              x: touches.pageX - touchOffset.x,
              y: touches.pageY - touchOffset.y
          };

          if (typeof isScrolling === 'undefined') {
              isScrolling = !!(isScrolling || Math.abs(delta.x) < Math.abs(delta.y));
          }

          if (!isScrolling && touchOffset) {
              translate(position.x + delta.x, 0, null);
          }

          // may be
          dispatchSliderEvent('on', 'touchmove', {
              event: event
          });
      }

      function onTouchend (event) {
          /**
           * time between touchstart and touchend in milliseconds
           * @duration {number}
           */
          var duration = touchOffset ? Date.now() - touchOffset.time : undefined;

          /**
           * is valid if:
           *
           * -> swipe attempt time is over 300 ms
           * and
           * -> swipe distance is greater than 25px
           * or
           * -> swipe distance is more then a third of the swipe area
           *
           * @isValidSlide {Boolean}
           */
          // const isValid = Math.abs(delta.x) > 25 || Math.abs(delta.x) > frameWidth / 3;
          var isValid = !!delta.x;

          /**
           * is out of bounds if:
           *
           * -> index is 0 and delta x is greater than 0
           * or
           * -> index is the last slide and delta is smaller than 0
           *
           * @isOutOfBounds {Boolean}
           */
          // const isOutOfBounds = !index && delta.x > 0 || index === slides.length - 1 && delta.x < 0;
          var isOutOfBounds = index === slides.length - 1 && delta.x < 0;

          var direction = delta.x < 0;

          var movedSlides = !delta.x ? 0 : (delta.x / slideWidth);
          movedSlides += direction ? -1 : 1;
          movedSlides |= 0;

          if (!isScrolling) {
              if (isValid && !isOutOfBounds) {
                  if (movedSlides == 1 || movedSlides == -1)
                    slide(false, direction);
                  else
                    slide(index - movedSlides, direction);
              } else {
                  translate(position.x, options.snapBackSpeed);
              }
          }

          touchOffset = undefined;

          /**
           * remove eventlisteners after swipe attempt
           */
          frame.removeEventListener('touchmove', onTouchmove);
          frame.removeEventListener('touchend', onTouchend);
          frame.removeEventListener('mousemove', onTouchmove);
          frame.removeEventListener('mouseup', onTouchend);
          frame.removeEventListener('mouseleave', onTouchend);

          dispatchSliderEvent('on', 'touchend', {
              event: event
          });
      }

      function onClick (event) {
          if (delta.x) {
              event.preventDefault();
          }
      }

      function onResize (event) {
          if (frameWidth !== elementWidth(frame)) {
              reset();

              dispatchSliderEvent('on', 'resize', {
                  event: event
              });
          }
      }

      // trigger initial setup
      setup();

      // expose public api
      return {
          setup,
          reset,
          slideTo,
          returnIndex,
          prev,
          next,
          destroy
      };
  }

})()