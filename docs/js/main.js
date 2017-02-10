(function (window, document) {
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


  var navbarElem = document.querySelector('.home-menu');
  var swiper = new Swiper('.page.swiper-container', {
    speed: 500,
    roundLengths: true,
    direction: 'vertical',
    threshold: 25,
    // slidesPerView: 1,
    slidesPerView: 'auto',
    centeredSlides: true,
    paginationClickable: true,
    spaceBetween: 0,
    mousewheelControl: true,
    freeMode: false,
    // grabCursor: true,

    // Scrollbar
    scrollbar: '.swiper-scrollbar',
    scrollbarHide: true,
    scrollbarDraggable: true,
    scrollbarSnapOnRelease: true,

    pagination: '.menu-pagination',
    paginationClickable: true,
    bulletClass: 'pure-menu-item',
    bulletActiveClass: 'pure-menu-selected',
    paginationBulletRender: function(swiper, index, className) {
      return swiper.paginationContainer[0].children[index].outerHTML;
    },
    breakpoints: {
      // when window width is <= 320px
      840: {
        // freeMode: true,
        spaceBetween: 0
      }
    },
    onInit: function(sw) {
      document.body.setAttribute('page', sw.snapIndex);
    },
    onTransitionEnd: function(sw) {
      console.log('TRANSITION END');
      document.body.setAttribute('page', sw.snapIndex);
      slideAnimation(sw);
    }
  });

  var startBtn = document.querySelector('[data-scroll]');
  swiper.$('[data-scroll]').on('click', function(evt) {
    var page = parseInt(evt.target.getAttribute('data-scroll'));
    evt.preventDefault();
    swiper.slideTo(page);
  });


  /**  Tab Swipers  **/
  function initializeTabSwiper(pageElem) {
    new Swiper(pageElem.querySelector('.swiper-container'), {
      speed: 500,
      roundLengths: true,
      direction: 'horizontal',
      slidesPerView: 1,
      spaceBetween: 20,
      freeMode: false,

      nextButton: pageElem.querySelector('.slide-button-next'),
      prevButton: pageElem.querySelector('.slide-button-prev'),

      pagination: pageElem.querySelector('.tabs-paginator'),
      paginationClickable: true,
      bulletClass: 'tab-item',
      bulletActiveClass: 'tab-item-selected',
      paginationBulletRender: function(swiper, index, className) {
        return swiper.paginationContainer[0].children[index].outerHTML;
      },
      onTransitionEnd: slideAnimation,
    });
  }
  var tabSwipers = document.querySelectorAll('.tabs-swiper');
  for (var i = 0; i < tabSwipers.length; i++) {
    initializeTabSwiper(tabSwipers[i]);
  }

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

  function imageRealBounds(imgEl) {
    var box = imgEl.getBoundingClientRect();

    var imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;
    var elemRatio = box.width / box.height;
    // console.log(Math.abs(elemRatio - imgRatio));
    if (Math.abs(elemRatio - imgRatio) > 0.03) {
      if (elemRatio > imgRatio) {
        var imgWidth = box.height * imgRatio;
        var offset = (box.width - imgWidth) / 2;
        box = {
          top: box.top,
          left: box.left + offset,
          right: box.left + offset + imgWidth,
          width: imgWidth,
          height: box.height,
        }
        // console.log('h_offset: '+offset);
      } else {
        var imgHeight = box.width / imgRatio;
        var offset = (box.height - imgHeight) / 2;
        box = {
          top: box.top + offset,
          left: box.left,
          right: box.left + box.width,
          width: box.width,
          height: imgHeight,
        }
        // console.log('v_offset: '+offset);
      }
    }
    return box;
  }

  function px(value) {
    return parseInt(value)+'px';
  }

  function updateLayout(s) {
    // var layout = s.width > s.height? 'horizontal' : 'vertical';
    var layout = s.width / s.height > 1.2? 'horizontal' : 'vertical';
    s.container.attr('layout', layout);

    var slideElem = s.slides[s.snapIndex];
    var panelElem = slideElem.querySelector('.image-panel');
    var footerEl = s.paginationContainer[0].parentElement;
    var imgElem = slideElem.querySelector('img');
    var imgBox = imageRealBounds(imgElem);
    if (s.container.attr('layout') === 'vertical') {
      panelElem.style.width = px(imgBox.width);
      panelElem.style.height = '';
      footerEl.style.width = '';
      footerEl.style.right = px(window.innerWidth - imgBox.right);
      var freeSpace = 100 * (1 - imgBox.height / window.innerHeight);
      // panelElem.style.maxHeight = 0.9*freeSpace + '%';
      // console.log(freeSpace)
    } else {
      s.paginationContainer[0].parentElement.style.top = px(imgBox.top);
      panelElem.style.height = px(imgBox.height);
      panelElem.style.width = '';
      footerEl.style.width = px(panelElem.children[0].offsetWidth);
      footerEl.style.right = px((window.innerWidth - imgBox.width - panelElem.offsetWidth) / 2);
    }
    footerEl.style.top = px(panelElem.getBoundingClientRect().top);

    slideAnimation(s);
  }


  function openGallery(evt, index) {
    var box = evt.target.getBoundingClientRect();
    var elem = evt.target.cloneNode(true);
    elem.className.baseVal = 'thumbnail';

    elem.style.position = 'fixed';
    elem.style.top = box.top + 'px';
    elem.style.left = box.left + 'px';
    elem.style.width = box.width + 'px';
    elem.style.height = box.height + 'px';

    var galleryElem = document.querySelector('.swiper-container-gallery');
    var slidesWrapper = document.querySelector('.gallery-images').cloneNode(true);
    galleryElem.appendChild(slidesWrapper);
    galleryElem.style.display = 'block';
    var gallerySwiper = new Swiper('.swiper-container-gallery', {
      speed: 500,
      // effect: 'fade',
      roundLengths: true,
      direction: 'horizontal',
      slidesPerView: 1,
      zoom: true,
      zoomMax: 1.25,
      initialSlide: index,
      keyboardControl: true,

      nextButton: '.swiper-container-gallery .button-next',
      prevButton: '.swiper-container-gallery .button-prev',
      pagination: '.swiper-container-gallery .swiper-pagination',
      paginationType: 'fraction',
      paginationClickable: true,

      onTransitionEnd: updateLayout,
      onInit: setTimeout.bind(null, updateLayout, gallerySwiper)
    });
    gallerySwiper.prevActiveIndex = -1;
    gallerySwiper.on('doubleTap', function(s) {
      if (s.zoom.scale !== 1) {
        s.slides[s.snapIndex].classList.add('zoomed');
      } else {
        s.slides[s.snapIndex].classList.remove('zoomed');
      }
    });

    gallerySwiper.updateLayout = updateLayout.bind(null, gallerySwiper);
    window.addEventListener('resize', gallerySwiper.updateLayout);
    window.gs = gallerySwiper;

    document.body.appendChild(elem);
    // Open animation
    setTimeout(function() {
      galleryElem.style.opacity = 1;
      var imgElem = gallerySwiper.slides[gallerySwiper.snapIndex].querySelector('img');
      var endBox = imageRealBounds(imgElem);


      gallerySwiper.$(elem).once('transitionend webkitTransitionEnd', function() {
        console.log('transitionend END');
        elem.remove();
        galleryElem.classList.add('initialized');
      });

      elem.className.baseVal += ' animated';

      var dx = endBox.left - box.left;
      var dy = endBox.top - box.top;
      var sx = endBox.width / box.width;
      var sy = endBox.height / box.height;

      elem.style.transform = 'translate3d('+dx+'px,'+dy+'px,0) scale3d('+sx+','+sy+',1)';
    }, 30);

    function close() {
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

  swiper.$('.thumbnails .thumbnail svg').on('click', function(evt) {
    var index = parseInt(evt.target.getAttribute('data-gallery-index')) || 0;
    openGallery(evt, index);
  });

  swiper.$('[data-animate], [data-animate-once]').addClass('invisible');
  window.sw = swiper;
})(this, this.document);
