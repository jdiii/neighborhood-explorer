'use strict'

/*
* In lieu of using an actual database, passing this raw data to my Model.
* Could use this data directly, but that would make some OOP-type things harder.
*/
var rawData = [
	{
		name: "Hops Test Kitchen",
		address: "1248 Cambridge St, Cambridge, MA 02139",
		comment: "Continually (and unfairly) empty, but pretty friendly bar with a great chef. Favorite part: Sierra Nevada Celebration Ale still on tap in April (did I mention it's usually empty?)..."
	},
	{
		name: "Kimchi Kitchen",
		address: "847 Cambridge St, Cambridge, MA 02141",
		comment: "Major obsession with this casual authentic-Korean restaurant. Is it really possible this beef bulgogi is just beef and spices? Inspired to make bibimbap every other night for weeks."
	},
	{
		name: "Back Bar",
		address: "7 Sanborn Ct, Somerville, MA 02143",
		comment: "An uberhip speakeasy in uberhip Union Square. If you can stop worrying that the overall-ed lumbersexual bartender's beard-hairs have drifted into your cocktail, you'll realize it's the best you've ever had."
	},
	{
		name: "CBC",
		address: "1 Kendall Square, Cambridge, MA 02139",
		comment: "Cambridge ordinance prevents me from going to Cambridge Brewing Co and merely having _beers_ outside, so it's usually _fries_ and beers outside."
	},
	{
		name: "Alden & Harlow",
		address: "40 Brattle St, Cambridge, MA 02138",
		comment: "Small plates for big prices, but it's worth it."
	},
	{
		name: "River Bar",
		address: "661 Assembly Row, Somerville, MA 02145",
		comment: "Assembly Row is a strange upscale strip mall... there is an Ikea Way with no Ikea on it, new buildings built to look old... so this odd cocktail bar by the river with all-year-round outdoor seating fits right in."
	}
];


/*
* Model.
* The motivation to implement Model in an OO way was
* to be able to switch between datasets...
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
		console.log(model);
		var placeList = [];
		for(var i = 0; i < data.length; i++){
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
	this.model = model;
	this.places = ko.observableArray(self.model.places);
	//displayed places. Intially, all of them.
	//this.currentPlaces = ko.observableArray(this.places);
	//Currently displayed place. Initially, none.
	this.currentPlace = ko.observable(null);
	this.infoWindow = new google.maps.InfoWindow();
};

Octopus.prototype.setCurrentPlace = function(place){

	var self = this;
	/* first, open the infoWindow and display the loading img */
	self.infoWindow.open(self.map, place.marker);
	self.infoWindow.setContent('<img width=16 height=16 src="img/load.gif">');

	if(self.map){
		self.map.panTo(new google.maps.LatLng(place.lat, place.lng));
	}

	/* meanwhile get the ajax data*/
	self.getWikiArticles(place,function(place){
		self.getImages(place,function(place){

			/* when ajax calls are complete, display everything */
			self.infoWindow.setContent(document.getElementById("infoWindowTemplate").innerHTML);
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
	        },
			error: function(){
				place.articles = [{title: ':(', snippet: 'There was an error retrieving events.'}];
			},
			success: function(data){

				place.articles = [];

				data.query.search.forEach(function(article){
					var obj = {};
					obj.title = article.title;
					obj.snippet = article.snippet;
					place.articles.push(obj);

				});

				done(place);
			}
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
			timeout: 5000,
			dataType: 'json',
			error: function(e){
				place.images = [{error: "Error retrieving images"}];
			},
			success: function(data){
				place.images = [];
				place.images = data.photos.photo;
				done(place);
			}
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
Octopus.prototype.createMarker = function(place,done){
	var place = place;
	var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + place.address;
	jQuery.getJSON(url, function(data){
		if(data.status == 'OK'){
			console.log(data);
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
			/*place.marker.addListener('click', function(){
				model.octopus.setCurrentPlace(that);
			});*/
			done(place.marker);
		} else {
			console.log('Error retreving lat/long');
			done(place.marker);
		}
	});
};
/*
* Google Maps functionality
* initMap() is the callback to the Google Maps call in index.html
* Add the map as a property of octopus.
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
		center: {lat: 42.3736, lng: -71.1061},
		scrollwheel: true,
		zoom: 13,
		styles: styles,
		mapTypeId: google.maps.MapTypeId.TERRAIN
	});

	return map;
};
//filter
Octopus.prototype.handleFocus = function(query){

	if(query == 'Filter...'){
		$('.nav__search__input').val('');
	}

};
Octopus.prototype.handleKeyup = function(query){

	var self = this;

	if(query == ''){
		self.places(model.places);
		this.places().forEach(function(p){
			p.marker.setVisible(true);
		});
		this.places();
		this.currentPlace(null);
	}

	if(query != ''){
		/* make a new places array*/
		var places = [];
		octopus.model.places.forEach(function(p){
			var q = query.toLowerCase();
			if(p.name.toLowerCase().indexOf(q) != -1 || p.address.toLowerCase().indexOf(q) != -1 || p.comment.toLowerCase().indexOf(q) != -1){
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

/* Initialize model and octopus*/
var model = new Model(rawData);
var octopus = new Octopus(model);
/* set up */
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

/*
* Event listeners for the hamburger menu
*/
$(".header").on('click','.header__hamburger',function(){
	$('.nav').toggle("0.25s");
});
$(".nav__list__close").on('click',function(){
	$('.nav').toggle();
});
$(".nav__search__input").on('focus',function(){
	var val = $(this).val();
	octopus.handleFocus(val);
});
$(".nav__search__input").on('keyup',function(){
	octopus.handleKeyup($(".nav__search__input").val());
});
