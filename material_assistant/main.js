$(function() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(showPosition, showError);
  } else {
    alert("Geolocation is not allowed on your browser");
  }

  function showPosition(position){
    var lat = position.coords.latitude;
    var long = position.coords.longitude;
    var now = moment().format('dddd') + ', ' + moment().format('LT');
    var jsonWeatherUrl = "https://fcc-weather-api.glitch.me/api/current?lat=" + lat + "&lon=" + long;
    $.getJSON(jsonWeatherUrl, function(data) {
      $('.city').html('<p class="city title">' + data.name + ', ' + data.sys.country + '</p>');
      $('.temperature').html('<p class="celsius">' + Math.round(data.main.temp) + '°C</p>');
      $('.weather-status').html('<p>' + now + ', ' + data.weather[0].main + '</p>');
      $('.weather-img').html("<img src='img/weather-" + data.weather[0].main + ".png' alt='" + data.weather[0].main + "'>");

      var settingsUnit = "Fahrenheit";

      var weatherSettings = '<div class="weather-settings">';
      weatherSettings += '<div class="overlay">';
      weatherSettings += '</div>';
      weatherSettings += '<div class="weather-settings-wrapper">';
      weatherSettings += '<div class="weather-settings-content">';
      weatherSettings += '<div class="weather-settings-options convert">';
      weatherSettings += '<i class="material-icons">ac_unit</i>';
      weatherSettings += '<p>Change unit to ' + settingsUnit + '</p>';
      weatherSettings += '</div><div class="weather-settings-options weather-close"><i class="material-icons">close</i><p>Cancel</p></div></div></div></div>';

      $(".card-button").click(function(){
        $("body").append(weatherSettings);
        $(".weather-close").click(function(){
          $(".weather-settings").remove();
        });
        $(".overlay").click(function(){
          $(".weather-settings").remove();
        });
        $(".convert").click(function(){
          var temp = Math.round(data.main.temp);
          convertToF(temp);
          $(".weather-settings").remove();
          $(".card-button").remove();
          settingsUnit = "Celsius";
        });
      });

    }); //getJSON

    function convertToF(celsius) {
      var fahrenheit;
      fahrenheit = celsius * 9 / 5 + 32;
      $('.temperature').html('<p>' + Math.round(fahrenheit) + '°F</p>');
    }

    // Google Places Card
    var jsonPlacesUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=" + lat + "," + long + "&radius=800&type=restaurant&key=AIzaSyDyNH4wEJLlgHgXPjNufjkl4wKUQs0EjnA";
    var proxy = 'https://cors-anywhere.herokuapp.com/'; // allows to bypass 'Access-Control-Allow-Origin' error
    var placesOutput = '';
    var rating = "";
    jsonPlacesUrl = proxy + jsonPlacesUrl;

    $.getJSON(jsonPlacesUrl, function(data) {
      $.each(data.results, function(index){
        if ('photos' in data.results[index] && 'name' in data.results[index]) {
          var link = data.results[index].photos[0].html_attributions;
          link = link.toString()
          link = link.substring(0, link.indexOf('>'));
          placesOutput += '<div class="places-wrapper">' + link + ' target="_blank"><div class="places-photo">';
          placesOutput += '<img src="https://maps.googleapis.com/maps/api/place/photo?maxwidth=569&photoreference=' + data.results[index].photos[0].photo_reference + '&key=AIzaSyDyNH4wEJLlgHgXPjNufjkl4wKUQs0EjnA" alt="restaurant picture">';
          placesOutput += '</div><div class="places-info">';
          placesOutput += '<p class ="places-name">' + data.results[index].name + '</p>';
          placesOutput += '<div class="places-ratings">';
          rating = Math.round(data.results[index].rating);
          for (var i = 0; i < rating; i++) {
            placesOutput += '<i class="material-icons">star_rate</i>';
          }
          placesOutput += '</div>';
          placesOutput += '<div class="places-address">';
          placesOutput += '<p>' + data.results[index].vicinity + '</p>';
          placesOutput += '</div>';
          placesOutput += '<div class="places-open">';
          if (typeof data.results[index].opening_hours  !== "undefined") {
            if (data.results[index].opening_hours.open_now == true) {
              placesOutput += '<p class="open-now">Open</p>';
            }
            if (data.results[index].opening_hours.open_now == false) {
            placesOutput += '<p class="not-open-now">Closed</p>';
            }
          }
          placesOutput += '</div>';
          placesOutput += '</div>';
          placesOutput += '</a></div>';
          $('.container').html(placesOutput);
        }
      }) // $.each
    }); //getJSON

  } //showPosition

  function showError(error) {
    switch(error.code) {
      case error.PERMISSION_DENIED:
      alert("Please allow geolocation in your browser in order to display your location.");
      break;
      case error.POSITION_UNAVAILABLE:
      alert("Location information is unavailable.");
      break;
      case error.TIMEOUT:
      alert("The request to get user location timed out.");
      break;
      case error.UNKNOWN_ERROR:
      alert("An unknown error occurred.");
      break;
    }
  }

  // Google Places API Key: AIzaSyA3gMvvY3ZubOi-FO2NZK0cEkhsHLmZ8M8
  // AIzaSyDTwHt13x3_5nn0seJGd_fKcpuep0AAxKk
  // AIzaSyDyNH4wEJLlgHgXPjNufjkl4wKUQs0EjnA

});
