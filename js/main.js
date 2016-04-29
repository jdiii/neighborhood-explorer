/* globals window, document, $, jQuery, google, console */
'use strict';

/*
* In lieu of using an actual database, passing this "raw data" to my Model.
* Could use this data directly.... but instead inserting into a Model object
*/
var rawData = [
	{
		name: "Fenway Park",
		address: "4 Yawkey Way, Boston, MA 02215"
	},
	{
		name: "Bunker Hill Monument",
		address: "Monument Sq, Charlestown, MA 02129"
	},
	{
		name: "Old North Church",
		address: "193 Salem St, Boston, MA 02113"
	},
	{
		name: "Paul Revere House",
		address: "19 N Square, Boston, MA 02113",
	},
	{
		name: "Massachusetts State House",
		address: "24 Beacon St, Boston, MA 02133"
	},
	{
		name: "Harvard Museum of Natural History",
		address: "26 Oxford St, Cambridge, MA 02138"
	},
	{
		name: "Old State House",
		address: "206 Washington Street, Boston, MA 02109"
	},
	{
		name: "Trinity Church",
		address: "206 Boylston St, Boston, MA"
	},
	{
		name: "Quincy Market",
		address: "1 Faneuil Hall Square, Quincy Market, Boston, MA 02109"
	}
];


/*
* Model.
* The motivation to implement Model in an OO way was
* to be able to switch between datasets... didn't actually end up doing that.
*/
var Model = function(data) {
	var data = data;
	/*
	* Model for the Place object
	* We could use a raw JSON object, but this seems like more fun...
	*/
	var Place = function(name, address, comment){
		this.name = name;
		this.address = address;
		this.comment = comment;
		this.articles = null;
		this.images = null;
	};
	//places is the array of Places
	this.places = (function(){
		var placeList = [];
		var dataLength = data.length;
		for(var i = 0; i < dataLength; i++){
			placeList.push(new Place(data[i].name, data[i].address, data[i].comment));
		}
		return placeList;
	})();
};

/*
* Octopus is the name of the ViewModel.
* It could more accurately be called ViewModel but I like Octopus...
* Contains the click handler between the
*/
var Octopus = function(model){
	var self = this;
	self.model = model;
	self.places = ko.observableArray(self.model.places);
	self.currentPlace = ko.observable(null);
	self.infoWindow = new google.maps.InfoWindow();
	self.infoWindow.addListener('closeclick',function(){
		self.currentPlace().marker.setIcon(null);
	});
};

Octopus.prototype.setCurrentPlace = function(place){

	/* set the selected map marker icon to a star */
	if(this.currentPlace()){
		this.currentPlace().marker.setIcon(null); //un-star prev marker
	}
	place.marker.setIcon({
		url: 'img/star.svg', //star new marker
	});

	var self = this;

	/* open the infoWindow and display the loading img */
	self.infoWindow.open(self.map, place.marker);
	self.infoWindow.setContent('<img width=16 height=16 src="img/load.gif">');

	/* pan to the selected marker */
	if(self.map){
		self.map.panTo(new google.maps.LatLng(place.lat, place.lng));
		self.map.panBy(0, -82); //this keeps the infowindow from displaying over the header, which displays with ~72px height
	}

	/* meanwhile get the ajax data*/
	self.getWikiArticles(place,function(place){
		self.getImages(place,function(place){
			self.infoWindow.close(); //this MIGHT make rendering look slightly nicer
			/* when ajax calls are complete, display everything */
			self.infoWindow.setContent(document.getElementById("infoWindowTemplate").innerHTML);
			self.infoWindow.open(self.map, place.marker);
    		//self.map.setCenter(place.marker.getPosition())
			if(document.getElementById("infoWindowTemplate").innerHTML){
				ko.cleanNode(document.getElementById("infoWindow"));
			}
			ko.applyBindings(self, document.getElementById("infoWindow"));
			self.currentPlace(place);

		});
	});

};

/*
* gets Wikipedia data from the Wikiapedia API for the @param place
* @param done is the method to run when the ajax request is complete,
* or if we find that we already have the articles data from a previous ajax call
*/
Octopus.prototype.getWikiArticles = function(place, done){

	var place = place;

	if(place.articles === null){

		var url = 'https://en.wikipedia.org/w/api.php';

		var parameters = {
			action: 'query',
			list: 'search',
			srsearch: place.name,
			srwhat: 'text',
			srlimit: '3',
			format: 'json'
		};

		$.ajax({
			url: url,
			data: parameters,
			method: 'GET',
			timeout: 5000,
			dataType: 'jsonp',
			headers: {
	            'Api-User-Agent': 'Neighborhood-App/1.0'
	        }
		}).done(function(data){
			place.articles = [];

			data.query.search.forEach(function(article){
				var obj = {};
				obj.title = article.title;
				obj.snippet = article.snippet;
				place.articles.push(obj);

			});

			done(place);
		}).fail(function(){
			place.articles = {error: 'There was an error retrieving articles.'};
			done(place);
		});

	} else {
		done(place);
	}
};

/*
* gets Flickr data from the for the @param place
* @param done is the method to run when the ajax request is complete,
* or if we find that we already have the image data from a previous ajax call
*/
Octopus.prototype.getImages = function(place, done){
	var place = place;

	if(place.images === null){

		var key = '058441ee782dc38f873dc3b3dbd9ebd5';
		var url = 'https://api.flickr.com/services/rest/';

		var parameters = {
			method: 'flickr.photos.search',
			api_key: key,
			text: place.name,
			per_page: 5,
			format: 'json',
			nojsoncallback: 1
		};

		$.ajax({
			url: url,
			data: parameters,
			method: 'GET',
			timeout: 5000, //after 5 seconds, --> error
			dataType: 'json'
		}).done(function(data){
			place.images = data.photos.photo;
			done(place);
		}).fail(function(){
			place.images = {error: "Error retrieving images"};
			done(place);
		});

	} else {
		done(place);
	}
};

/*
* createMarker
* @param place is the place to add a marker to
* @param done should be callback function to execute on completion of the ajax request
*/
Octopus.prototype.createMarker = function(place, done){

	var self = this;
	var place = place;

	/*
	* ajax request for gmaps geocode
	*/
	var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + place.address;
	jQuery.getJSON(url, function(data){
		if(data.status == 'OK'){

			console.log('Status OK for ' + place.name + '\'s geodata.');

			place.lat = data.results[0].geometry.location.lat;
			place.lng = data.results[0].geometry.location.lng;

			var latlng = {lat: place.lat, lng: place.lng};

			var marker = new google.maps.Marker({
				position: latlng,
				title: "Hello World!",
				animation: google.maps.Animation.DROP,
				draggable: false
			});

			place.marker = marker;

			done(place.marker);

		} else {

			console.log('Error retreving lat/long for ' + ''); //the API is rate limited, so this is kinda useful

			self.infoWindow.setContent('Error: no geodata. You may have used all your geocode API credits :(');

			self.infoWindow.open(self.map); //display error message onscreen

			done(place.marker);
		}
	});
};
/*
* Google Maps initialization
* @return map
*/
Octopus.prototype.initMap = function() {
	var height = window.innerHeight;
	document.getElementById("mapContainer").style.height = height + 'px';
	var styles = [
	  {
	    stylers: [
	      { saturation: -50 }
	    ]
	  },{
	    featureType: "road",
	    elementType: "geometry",
	    stylers: [
	      { lightness: 100 },
	      { visibility: "simplified" }
	    ]
	  }
	];
 	// Create a map object and specify the DOM element for display.
	var map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 42.3551, lng: -71.0656}, //boston common...
		scrollwheel: true,
		zoom: 12,
		styles: styles,
		mapTypeId: google.maps.MapTypeId.TERRAIN,
		mapTypeControl: false,
  		zoomControl: true,
  		mapTypeControl: false,
  		scaleControl: false,
  		streetViewControl: false,
  		rotateControl: false,
  		fullscreenControl: false,
	});

	/* resize map container when the window is resized */
	$(window).on('resize',function(){
		var height = window.innerHeight;
		document.getElementById("mapContainer").style.height = height + 'px';
	});


	return map;
};


/*
* handleFocus is fired when there's a focus event on the search input
* Takes an @param query from the input textbox
* If the textbox contains the filler text "Filter...",
* it gets cleared out of the textbox.
*/
Octopus.prototype.handleFocus = function(query){

	if(query == 'Filter...'){
		$('.nav__search__input').val('');
	}

};

/*
* handleKeyup takes a search @param query
* and filters which map markers are shown
* and which navigation links are shown
* based on the search result
*
* searches both place.address and place.name for the query string
*/

Octopus.prototype.handleKeyup = function(query){

	var self = this;

	if(query == ''){
		self.places(self.model.places);
		this.places().forEach(function(p){
			p.marker.setVisible(true);
		});
		this.places();
		this.currentPlace(null);
	}

	if(query != ''){
		/* make a new places array*/
		var places = [];
		self.model.places.forEach(function(p){
			var q = query.toLowerCase();
			if(p.name.toLowerCase().indexOf(q) != -1 || p.address.toLowerCase().indexOf(q) != -1){
				places.push(p);
			}
		});
		/* set marker visibility to false for all places */
		self.places().forEach(function(p){
			p.marker.setVisible(false);
		});
		/* set marker visibility to true for places in the array */
		places.forEach(function(p){
			p.marker.setVisible(true);
		});
		/* send octopus the new places */
		self.places(places);
		self.currentPlace(null);
	}

};


var viewmodel = null; //event listeners will attach to this global reference
/* Called by Google Maps successful loading*/
function init(){
	/* Initialize model and octopus*/
	var model = new Model(rawData);
	var octopus = new Octopus(model);
	/* set up Map */
	octopus.map = octopus.initMap();

	/* initialize map markers */
	octopus.places().forEach(function(place){
		octopus.createMarker(place, function(marker){
			marker.setMap(octopus.map);
			marker.addListener('click',function(){
				octopus.setCurrentPlace(place);
			});
		});
	});
	/* apply knockout bindings */
	ko.applyBindings(octopus);
	viewmodel = octopus;
}
function googleError(){
	$("#map").css('margin','auto 100px').text('There was an error loading the Google Maps API. This app won\'t function without it ');
}

/*
* Event listeners for the hamburger menu and navigation
*/

//Open the navigation menu
$(".header").on('click','.header__elem__hamburger',function(){
	$('.nav').toggle();
	viewmodel.infoWindow.close();
	if(viewmodel.currentPlace()){
		viewmodel.currentPlace().marker.setIcon(null);
	}
});
//close the navigation menu when close buttons are pressed
$(".nav__list__close, .nav__float__close").on('click',function(){
	$('.nav').toggle();
});
//when Search input is focused, clear out the filler "Filter..." text
$(".nav__search__input").on('focus',function(){
	var val = $(this).val();
	viewmodel.handleFocus(val);
});
//refine search results every time you enter a letter in search input
$(".nav__search__input").on('keyup',function(){
	viewmodel.handleKeyup($(".nav__search__input").val());
});
