function typing() {
  setTimeout(function(){
    $(".message").removeClass("message-indicator").html("");
    return;
  }, 2600);
}

function displayMessage() {
  setTimeout(function(){
    $(".message").addClass("message-bubble").html("<p>Hi! I'm Stephan</p>");
    return;
  }, 2700);
}

function typing2() {
  setTimeout(function(){
    $(".message2").addClass("message-indicator").html("  <span></span><span></span><span></span>");
    return;
  }, 4500);
}

function displayMessage2() {
  setTimeout(function(){
    $(".message2").removeClass("message-indicator").addClass("message-bubble").html("<p>I'm a developer with extensive practical experience in Digital Strategy. I like well-conceived UX/UI and beautiful code. Also a huge fan of Sci-Fi movies <i class='em em-sunglasses'></i><i class='em em-popcorn'></i></p>");
    return;
  }, 7400);
}

function removeToggle() {
  // remove Toggle Menu
  $(".item").removeClass("nav-item");
  $("nav").removeClass("nav");
  $(".toggle").removeClass("button button-toggle");
}

function addToggle() {
  // add Toggle Menu
  $(".item").addClass("nav-item");
  $("nav").addClass("nav");
  $(".toggle").addClass("button button-toggle");
}

function slider() {
  settings = {
    autoplay: true,
    autoplaySpeed: 4000,
    speed: 1000,
    dots: true,
    arrows: false,
    mobileFirst: true,
  }
  $('.slider').slick(settings);
}

function formSuccess() {
  $("form").html("<h4>Thank You!</h4><p>Your email has been sent. I'll be in touch with you soon.</p>");
  console.log("Success!");
}

function formError() {
  alert("Error");
}


//********** $(document).ready() ***********//
$(function() {

  typing();
  displayMessage();
  typing2()
  displayMessage2();
  slider();



  //********** Form Submit ***********/
  $("form").validate({
    rules: {
      name: {
        required: true
      },
      email: {
        required: true,
        email: true
      },
      phone: {
        digits: true
      },
      message: {
        required: true,
        minlength: 20
      }
    },
    submitHandler: function(form) {
      $.ajax({
        url: "https://formspree.io/stephan.orgiazzi@gmail.com",
        method: "POST",
        data: {
          name: $("#name").val(),
          email: $("#email").val(),
          phone: $("#phone").val(),
          message: $("#message").val()
        },
        dataType: "json",
        success: formSuccess,
        error: formError
      })
    }
  });


  //********** Responsive ***********//
  if (window.matchMedia("(min-width: 1025px)").matches) {
    // remove Slider
    $('.slider').slick('unslick');
    // remove Toggle
    removeToggle()
    // add Sticky Nav
    $("#header").sticky({topSpacing:0});
  }


  $(window).on('resize', function() {

    if ($(window).width() > 1025) {
      // reslick only if it's not slick()
      if ($('.slider').hasClass('slick-initialized')) {
        $('.slider').slick('unslick');
        // remove Toggle
        removeToggle()
        // add Sticky Nav
        $("#header").sticky({topSpacing:0});
      }
      return;
    }

    if ($(window).width() < 1024) {
      // add Toggle
      addToggle();
      // remove Sticky Nav
      $("#header").unstick();
    }

    // add Slider
    if (!$('.slider').hasClass('slick-initialized')) {
      return $('.slider').slick(settings);
    }

  }); // $(window).on('resize', function()

  //********************************//

}); // $(document).ready()
