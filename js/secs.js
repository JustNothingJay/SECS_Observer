/* ===================================================================
   SECS – Section navigation logic
   Adapted from Raleway template pattern (jQuery slideUp/slideDown)
   =================================================================== */

(function ($) {
    'use strict';

    // Section switching
    var $sections = $('#menu-container > div');
    var $navLinks = $('.main-menu a');

    function showSection(index) {
        $sections.each(function () {
            var $el = $(this);
            if ($el.index() === index) {
                $el.slideDown(300);
            } else {
                $el.slideUp(200);
            }
        });
        $navLinks.removeClass('active');
        $navLinks.filter('.show-' + (index + 1)).addClass('active');
    }

    // Nav click handlers
    $navLinks.on('click', function (e) {
        e.preventDefault();
        var cls = this.className.match(/show-(\d+)/);
        if (cls) {
            var idx = parseInt(cls[1], 10) - 1;
            showSection(idx);

            // Close mobile nav
            $('.menu-responsive').slideUp(200);

            // Scroll to top of content
            $('html, body').animate({ scrollTop: 0 }, 200);
        }
    });

    // Mobile toggle
    $('.toggle-nav').on('click', function (e) {
        e.preventDefault();
        $('.menu-responsive').slideToggle(200);
    });

    // Show home section on load
    showSection(0);

})(jQuery);
