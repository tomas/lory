/* globals jQuery */

import detectPrefixes from './utils/detect-prefixes.js';
import supportsPassive from './utils/detect-supportsPassive';
import dispatchEvent from './utils/dispatch-event.js';
import defaults from './defaults.js';

const slice = Array.prototype.slice;

export function lory (slider, opts) {
    let position;
    let slideWidth;
    let frameWidth;
    let slides;
    let resetting;

    /**
     * slider DOM elements
     */
    let frame;
    let slideContainer;
    let prevCtrl;
    let nextCtrl;
    let prefixes;
    let transitionEndCallback;

    let index   = 0;
    let options = {};
    let touchEventParams = supportsPassive() ? { passive: true } : false;

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
        const {classNameActiveSlide} = options;

        slides.forEach((element, index) => {
            if (element.classList.contains(classNameActiveSlide)) {
                element.classList.remove(classNameActiveSlide);
            }
        });

        slides[currentIndex].classList.add(classNameActiveSlide);
    }

    /**
     * private
     * setupInfinite: function to setup if infinite is set
     *
     * @param  {array} slideArray
     * @return {array} array of updated slideContainer elements
     */
    function setupInfinite (slideArray) {
        const {infinite} = options;

        const front = slideArray.slice(0, infinite);
        const back  = slideArray.slice(slideArray.length - infinite, slideArray.length);

        front.forEach(function (element) {
            const cloned = element.cloneNode(true);

            slideContainer.appendChild(cloned);
        });

        back.reverse()
            .forEach(function (element) {
                const cloned = element.cloneNode(true);

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
        const style = slideContainer && slideContainer.style;

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
        const {
            slideSpeed,
            slidesToScroll,
            infinite,
            rewind,
            rewindPrev,
            rewindSpeed,
            ease,
            classNameActiveSlide,
            classNameDisabledNextCtrl = 'disabled',
            classNameDisabledPrevCtrl = 'disabled'
        } = options;

        var duration = slideSpeed;
        var nextSlide = direction ? index + 1 : index - 1;
        var perPage = Math.floor(frameWidth / slideWidth);

        dispatchSliderEvent('before', 'slide', {
            index,
            nextSlide
        });

        /**
         * Reset control classes
         */
        if (prevCtrl) {
            prevCtrl.classList.remove(classNameDisabledPrevCtrl);
        }
        if (nextCtrl) {
            nextCtrl.classList.remove(classNameDisabledNextCtrl);
        }

        if (typeof nextIndex !== 'number') {
            if (direction) {
              if (infinite && index + (infinite * 2) !== slides.length) {
                  nextIndex = index + (infinite - index % infinite);
              } else {
                  nextIndex = index + slidesToScroll;
              }
            } else {
              if (infinite && index % infinite !== 0) {
                  nextIndex = index - index % infinite;
              } else {
                  nextIndex = index - slidesToScroll;
              }
            }
        }

        nextIndex = Math.min(Math.max(nextIndex, 0), slides.length - perPage);

        if (infinite && direction === undefined) {
            nextIndex += infinite;
        }

        if (rewindPrev && Math.abs(position.x) === 0 && direction === false) {
            nextIndex = slides.length - 1;
            duration = rewindSpeed;
        }

        if (!slides[nextIndex])
          return console.warn('Slide not found', nextIndex)

        // let nextOffset = Math.min(Math.max(slides[nextIndex].offsetLeft * -1, maxOffset * -1), 0);
        let nextOffset = slides[nextIndex].offsetLeft * -1;

        if (rewind && Math.abs(position.x) === maxOffset && direction) {
            nextOffset = 0;
            nextIndex = 0;
            duration = rewindSpeed;
        }

        /**
         * translate to the nextOffset by a defined duration and ease function
         */
        translate(nextOffset, duration, ease);

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

            transitionEndCallback = function () {
                translate(slides[index].offsetLeft * -1, 0, undefined);
            };
        }

        if (classNameActiveSlide) {
            setActiveElement(slice.call(slides), index);
        }

        /**
         * update classes for next and prev arrows
         * based on user settings
         */
        if (prevCtrl && !infinite && !rewindPrev && nextIndex === 0) {
            prevCtrl.classList.add(classNameDisabledPrevCtrl);
        }

        if (nextCtrl && !infinite && !rewind && nextIndex + 1 === slides.length) {
            nextCtrl.classList.add(classNameDisabledNextCtrl);
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
        options = {...defaults, ...opts};

        const {
            classNameFrame,
            classNameSlideContainer,
            classNamePrevCtrl,
            classNameNextCtrl,
            classNameDisabledNextCtrl = 'disabled',
            classNameDisabledPrevCtrl = 'disabled',
            enableMouseEvents,
            classNameActiveSlide,
            initialIndex
        } = options;

        setIndex(initialIndex);
        frame = slider.getElementsByClassName(classNameFrame)[0];
        slideContainer = frame.getElementsByClassName(classNameSlideContainer)[0];
        prevCtrl = slider.getElementsByClassName(classNamePrevCtrl)[0];
        nextCtrl = slider.getElementsByClassName(classNameNextCtrl)[0];

        position = {
            x: slideContainer.offsetLeft,
            y: slideContainer.offsetTop
        };

        if (options.infinite) {
            slides = setupInfinite(slice.call(slideContainer.children));
        } else {
            slides = slice.call(slideContainer.children);

            if (prevCtrl && !options.rewindPrev) {
                prevCtrl.classList.add(classNameDisabledPrevCtrl);
            }

            if (nextCtrl && slides.length === 1 && !options.rewind) {
                nextCtrl.classList.add(classNameDisabledNextCtrl);
            }
        }

        var images = slideContainer.getElementsByTagName('IMG');
        onImagesLoaded(images, function() {
            reset();

            if (classNameActiveSlide) {
                setActiveElement(slides, index);
            }

            if (prevCtrl && nextCtrl) {
                prevCtrl.addEventListener('click', prev);
                nextCtrl.addEventListener('click', next);
            }

            frame.addEventListener('touchstart', onTouchstart, touchEventParams);

            if (enableMouseEvents) {
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

        var {infinite, ease, rewindSpeed, rewindOnResize, classNameActiveSlide, initialIndex} = options;

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

        if (rewindOnResize) {
            setIndex(initialIndex);
        } else {
            ease = null;
            rewindSpeed = 0;
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

    let touchOffset;
    let delta;
    let isScrolling;

    function onTransitionEnd () {
        if (transitionEndCallback) {
            transitionEndCallback();

            transitionEndCallback = undefined;
        }
    }

    function onTouchstart (event) {
        const {enableMouseEvents} = options;
        const touches = event.touches ? event.touches[0] : event;

        if (enableMouseEvents) {
            frame.addEventListener('mousemove', onTouchmove);
            frame.addEventListener('mouseup', onTouchend);
            frame.addEventListener('mouseleave', onTouchend);
        }

        frame.addEventListener('touchmove', onTouchmove, touchEventParams);
        frame.addEventListener('touchend', onTouchend);

        const {pageX, pageY} = touches;

        touchOffset = {
            x: pageX,
            y: pageY,
            time: Date.now()
        };

        isScrolling = undefined;

        delta = {};

        dispatchSliderEvent('on', 'touchstart', {
            event
        });
    }

    function onTouchmove (event) {
        const touches = event.touches ? event.touches[0] : event;
        const {pageX, pageY} = touches;

        delta = {
            x: pageX - touchOffset.x,
            y: pageY - touchOffset.y
        };

        if (typeof isScrolling === 'undefined') {
            isScrolling = !!(isScrolling || Math.abs(delta.x) < Math.abs(delta.y));
        }

        if (!isScrolling && touchOffset) {
            translate(position.x + delta.x, 0, null);
        }

        // may be
        dispatchSliderEvent('on', 'touchmove', {
            event
        });
    }

    function onTouchend (event) {
        /**
         * time between touchstart and touchend in milliseconds
         * @duration {number}
         */
        const duration = touchOffset ? Date.now() - touchOffset.time : undefined;

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
        const isValid = !!delta.x;

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
        const isOutOfBounds = index === slides.length - 1 && delta.x < 0;

        const direction = delta.x < 0;

        var movedSlides = !delta.x ? 0 : (delta.x / slideWidth);
        movedSlides += direction ? -1 : 1;
        movedSlides |= 0;

        if (!isScrolling) {
            if (isValid && !isOutOfBounds) {
                if (Math.abs(movedSlides) == 1)
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
            event
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
                event
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
