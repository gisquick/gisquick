(function (window, document) {
  window.Dom7 = new Swiper().$;

  var menu = document.getElementById('menu');
  var WINDOW_CHANGE_EVENT = ('onorientationchange' in window) ? 'orientationchange':'resize';

  function toggleHorizontal() {
    menu.classList.toggle('pure-menu-horizontal');
  };

  function toggleMenu() {
    // set timeout so that the panel has a chance to roll up
    // before the menu switches states
    if (menu.classList.contains('open')) {
      setTimeout(toggleHorizontal, 500);
    }
    else {
      toggleHorizontal();
    }
    menu.classList.toggle('open');
    document.getElementById('toggle').classList.toggle('x');
  }

  function closeMenu() {
    if (menu.classList.contains('open')) {
      toggleMenu();
    }
  }

  menu.addEventListener('click', function(e) {
    if (e.target.classList.contains('pure-menu-item')) {
      closeMenu();
    }
  });
  document.getElementById('toggle').addEventListener('click', function(e) {
    toggleMenu();
    e.preventDefault();
  });

  window.addEventListener(WINDOW_CHANGE_EVENT, closeMenu);



  function slideAnimation(s) {
    if (s.snapIndex === (s.prevActiveIndex || 0)) {
      // the same slide => skip animation
      return;
    }
    var slideElem = s.slides[s.snapIndex];
    var nestedSwiperSlide = slideElem.querySelector('.swiper-slide-active');
    if (nestedSwiperSlide) {
      console.log('NESTED SWIPER');
      slideElem = nestedSwiperSlide;
    }
    var animatedElems = slideElem.querySelectorAll('[data-animate], [data-animate-once]');
    var excluded = slideElem.querySelectorAll('.hidden [data-animate], .hidden [data-animate-once]');
    function isExcluded(node) {
      for (var i = 0; i < excluded.length; i++) {
        if (excluded[i] === node) {
          return true;
        }
      }
    }
    for (var i = 0; i < animatedElems.length; i++) {
      var elem = animatedElems[i];
      if (isExcluded(elem)) {
        continue;
      }
      var oneTimeAnimation = elem.getAttribute('data-animate-once');
      var animation = elem.getAttribute('data-animate') || oneTimeAnimation;
      elem.classList.remove('invisible');
      elem.classList.add('animated');
      elem.classList.add(animation);
      if (!oneTimeAnimation) {
        s.$(elem).once('animationend webkitAnimationEnd', function(el, animClass) {
          el.classList.remove('animated');
          el.classList.remove(animClass);
        }.bind(null, elem, animation));
      }
    }
    s.$('.swiper-slide:not(.swiper-slide-active) [data-animate], .swiper-slide:not(.swiper-slide-active) [data-animate-once]:not(.animated)', s.wrapper[0]).addClass('invisible');
    s.prevActiveIndex = s.snapIndex;
  }


  /** Swiper gallery **/
  function galleryLayout(sw) {
    if (sw.slides.length === 0) return;

    var layout = sw.width / sw.height > 1.2? 'horizontal' : 'vertical';
    sw.container.attr('layout', layout);

    var slideEl = sw.slides[sw.snapIndex];
    var imgEl = slideEl.querySelector('img');
    var imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;

    var parent = imgEl.parentElement;
    var parentBox = parent.getBoundingClientRect()
    var padding = parseFloat(Dom7(parent).css('padding'));

    var containerBox = {
      top: parentBox.top+padding,
      left: parentBox.left+padding,
      width: parentBox.width-2*padding,
      height: parentBox.height-2*padding
    }
    // compute available space for image element
    var availableSpace;
    if (layout === 'horizontal') {
      availableSpace = {
        top: containerBox.top,
        left: containerBox.left,
        width: Math.min(containerBox.width * 0.8, containerBox.width-175),
        height: containerBox.height
      };
    } else {
      var h = Math.max(containerBox.width * 0.8, 150);
      availableSpace = {
        width: containerBox.width,
        height: h,
        top: containerBox.top + (containerBox.height - h), // align bottom
        left: containerBox.left
      };
    }

    // compute a visible image bounds inside availableSpace
    var objPos = Dom7(imgEl).css('object-position').split(' ');
    var imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;
    var elemRatio = availableSpace.width / availableSpace.height;
    var box;
    if (elemRatio > imgRatio) {
      var objPosX = parseFloat(objPos[0].replace('%', '')/100);
      var imgWidth = availableSpace.height * imgRatio;
      var offset = (availableSpace.width - imgWidth) / 2;
      box = {
        top: availableSpace.top,
        left: availableSpace.left + offset,
        right: availableSpace.left + offset + imgWidth,
        width: imgWidth,
        height: availableSpace.height,
      }
    } else {
      var objPosY = parseFloat(objPos[1].replace('%', '')/100);
      var imgHeight = availableSpace.width / imgRatio;
      var offset = (availableSpace.height - imgHeight) * objPosY;
      box = {
        top: availableSpace.top + offset,
        left: availableSpace.left,
        right: availableSpace.left + availableSpace.width,
        width: availableSpace.width,
        height: imgHeight,
      }
    }

    // apply layout settings for all slides
    for (var i = 0; i < sw.slides.length; i++) {
      slideEl = sw.slides[i];
      var panelEl = Dom7('.image-panel', slideEl);
      if (layout === 'horizontal') {
        panelEl.css({
          width: px(containerBox.width - availableSpace.width),
          height: px(box.height)
        });
      } else {
        panelEl.css({
          width: '',
          height: px(containerBox.height - box.height)
        });
      }
      Dom7('img', slideEl).css('minWidth', px(box.width));
    }

    // toolbar layout
    var toolbarEl = sw.container.find('.gallery-toolbar');
    if (layout === 'horizontal') {
      toolbarEl.css({
        width: px(containerBox.width - availableSpace.width),
        left: px(box.left + box.width),
        top: px(box.top)
      });
    } else {
      toolbarEl.css({
        width: '',
        left: '',
        top: ''
      });
    }

    sw.layoutParams = {
      imgBox: box,
      imgAvailableBox: availableSpace
    };

    // Dom7('.available').css({
    //   top: px(availableSpace.top),
    //   left: px(availableSpace.left),
    //   width: px(availableSpace.width),
    //   height: px(availableSpace.height)
    // })

    // Dom7('.image').css({
    //   top: px(box.top),
    //   left: px(box.left),
    //   width: px(box.width),
    //   height: px(box.height)
    // })
  }


  function px(value) {
    return parseInt(value)+'px';
  }

  function openGallery(evt, index) {
    var box = evt.target.getBoundingClientRect();
    var elem = Dom7(evt.target.cloneNode(true));
    elem.addClass('thumbnail');

    elem.css({
      position: 'fixed',
      top: box.top + 'px',
      left: box.left + 'px',
      width: box.width + 'px',
      height: box.height + 'px'
    });

    var galleryElem = document.querySelector('.swiper-container-gallery');
    var slidesWrapper = document.querySelector('.gallery-images').cloneNode(true);
    galleryElem.appendChild(slidesWrapper);
    galleryElem.style.display = 'block';
    var gallerySwiper = new Swiper('.swiper-container-gallery', {
      speed: 500,
      threshold: 20,
      // effect: 'fade',
      roundLengths: true,
      direction: 'horizontal',
      slidesPerView: 1,
      // zoom: true,
      // zoomMax: 1,
      initialSlide: index,
      keyboardControl: true,

      nextButton: '.swiper-container-gallery .button-next',
      prevButton: '.swiper-container-gallery .button-prev',
      pagination: '.swiper-container-gallery .swiper-pagination',
      paginationType: 'fraction',
      paginationClickable: true,

      onTransitionEnd: slideAnimation,
      onInit: setTimeout.bind(null, function(sw) {
        sw.container.removeClass('zoom-mode');
        galleryLayout(sw);
        slideAnimation(sw);
      }, gallerySwiper)
    });
    gallerySwiper.prevActiveIndex = -1;
    gallerySwiper.on('doubleTap', function(s, evt) {
      if (evt.target.tagName === 'IMG') {
        s.container.toggleClass('zoom-mode');
        // galleryLayout(s);
      }
    });

    gallerySwiper.updateLayout = galleryLayout.bind(null, gallerySwiper);
    window.addEventListener('resize', gallerySwiper.updateLayout);

    document.body.appendChild(elem[0]);
    // Open animation
    setTimeout(function() {
      document.body.classList.add('modal-open');
      galleryElem.style.opacity = 1;

      var endBox = gallerySwiper.layoutParams.imgBox;
      elem.transitionEnd(function() {
        elem.remove();
        galleryElem.classList.add('initialized');
      });

      elem.addClass('animated');

      var dx = endBox.left - box.left;
      var dy = endBox.top - box.top;
      var sx = endBox.width / box.width;
      var sy = endBox.height / box.height;

      elem.transform('translate3d('+dx+'px,'+dy+'px,0) scale3d('+sx+','+sy+',1)');
    }, 30);

    function close() {
      document.body.classList.remove('modal-open');
      galleryElem.style.opacity = 0;
      setTimeout(function() {
        window.removeEventListener('resize', gallerySwiper.updateLayout);
        gallerySwiper.removeAllSlides();
        gallerySwiper.destroy();
        galleryElem.style.display = '';
        galleryElem.classList.remove('initialized');
        slidesWrapper.remove();
        gallerySwiper = null;
      }, 500);
    }
    function keyHandler(evt) {
      if (evt.keyCode === 27) {
        document.removeEventListener('keydown', keyHandler);
        close();
      }
    }
    gallerySwiper.$('.dialog-close').once('click', close);
    var keyListener = document.addEventListener('keydown', keyHandler);
  }


  Dom7('.thumbnails .thumbnail svg').on('click', function(evt) {
    var index = parseInt(evt.target.getAttribute('data-gallery-index')) || 0;
    openGallery(evt, index);
  });

  Dom7('[data-animate], [data-animate-once]').addClass('invisible');



  Dom7('[data-link]').on('click', function(evt) {
    var targetLink = evt.target.getAttribute('data-link');
    // var activeItem = evt.target.parentElement.querySelector('.pure-menu-selected');
    // if (activeItem && activeItem !== evt.target) {
    //   activeItem.classList.remove('pure-menu-selected');
    // }
    // evt.target.classList.add('pure-menu-selected');
    Jump(targetLink);
  });

  /*
  document.addEventListener('DOMContentLoaded', function(){
    var trigger = new ScrollTrigger({
      toggle: {
        visible: 'v',
        hidden: 'h'
      },
      offset: {
        x: 0,
        y: 0
      },
      addHeight: true
    }, document.body, window);
  });*/

  function sectionEntered(target) {
    // console.log('sectionEntered '+target);
    var newActiveItem = document.querySelector('.home-menu [data-link="'+target+'"]');
    var activeItem = document.querySelector('.home-menu .pure-menu-selected');
    if (activeItem && activeItem !== newActiveItem) {
      activeItem.classList.remove('pure-menu-selected');
    }
    newActiveItem.classList.add('pure-menu-selected');
  }


  var targets = document.querySelectorAll('[data-scroll-target]');
  var links = [];
  for (var i = 0; i < targets.length; i++) {
    var target = targets[i];
    links.push(target.getAttribute('data-scroll-target'));
    new Waypoint({
      element: target,
      handler: function(direction) {
        var targetLink = this.element.getAttribute('data-scroll-target');
        if (direction === 'up') {
          targetLink = links[links.indexOf(targetLink) - 1];
        }
        sectionEntered(targetLink);
      },
      offset: (i < targets.length - 1)? '50%' : '85%'
    });
  }

  var elems = document.querySelectorAll('[data-scroll-anim]');
  for (var i = 0; i < elems.length; i++) {
    var elem = elems[i];
    var classes = elem.getAttribute('data-scroll-anim').split(',');
    elem.classList.add(classes.pop());
    new Waypoint({
      element: elem,
      offset: '100%',
      handler: function(direction) {
        var classes = this.element.getAttribute('data-scroll-anim').split(',');
        if (direction === 'down') {
          this.element.classList.add(classes[0]);
          this.element.classList.remove(classes[1]);
        } else {
          this.element.classList.remove(classes[0]);
          this.element.classList.add(classes[1]);
        }
      }
    });
  }

  new Swiper('.people .swiper-container', {
    speed: 500,
    nextButton: '.slide-button-next',
    prevButton: '.slide-button-prev',
    slidesPerView: 3.25,
    breakpoints: {
      1200: {
        slidesPerView: 2.25
      },
      680: {
        slidesPerView: 1.25
      }
    }
  });
})(this, this.document);
