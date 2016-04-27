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
var Model = function(data, map) {

	var data = data;
	var map = map;

	/*
	* Model for the Place object
	* We could use a raw JSON object, but this seems like more fun...
	* ...not to mention that the Map Marker can be a child of its parent Place
	*/
	var Place = function(name, address, comment){
		this.name = name;
		this.address = address;
		this.comment = comment;
		this.articles = null;
		this.images = null;
	};
	/*
	* We will query for API data once, upon viewing a Place for the first time.
	*/
	Place.prototype.putWikiData = function(){

	};
	Place.prototype.putEventsData = function(){

	};
	Place.prototype.createMapMarker = function(map,done){
		var that = this;
		var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + this.address;
		jQuery.getJSON(url, function(data){
			if(data.status == 'OK'){
				console.log(data);
				that.lat = data.results[0].geometry.location.lat;
				that.lng = data.results[0].geometry.location.lng;
				var latlng = {lat: that.lat, lng: that.lng};
				var marker = new google.maps.Marker({
		    		position: latlng,
		    		title: "Hello World!",
					map: map,
    				animation: google.maps.Animation.DROP,
					draggable: false
				});
				that.marker = marker;
				that.marker.addListener('click', function(){
					model.octopus.setCurrentPlace(that);
				});
			} else {
				console.log('Error retreving lat/long');
			}
		});
	}
	Place.prototype.setMap = function(map){
		this.map = map;
		this.createMapMarker(map);
	}
	Place.prototype.setModel = function(model){
		this.model = model;
	}

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
* Init(): the model passes references to itself to all Places
* the model also gets a reference to the octopus
*/
Model.prototype.init = function(octopus){
	var self = this;
	this.octopus = octopus;
	this.places.forEach(function(p){
		p.model = self;
	});
	octopus.places(this.getAll());
	//octopus.setCurrentPlace(this.places[0]);
}
Model.prototype.getAll = function(){
	return this.places;
};

Model.prototype.setMap = function(map){
	this.map = map;
	this.places.forEach(function(e){
		e.setMap(map);
	});
};


/*
* Octopus is the name of the ViewModel.
* It could more accurately be called ViewModel but I like Octopus...
* Contains the click handler between the
*/
var Octopus = function(model){
	this.model = model;
	this.places = ko.observableArray([]);
	this.currentPlace = ko.observable(0);
};
Octopus.prototype.setMap = function(map){
	this.model.setMap(map);
};
Octopus.prototype.setCurrentPlace = function(place){
	this.currentPlace(place);
	if(model.map){
		model.map.panTo(new google.maps.LatLng(this.currentPlace().lat, this.currentPlace().lng));
	}
	this.getWikiArticles();
	this.getImages();
};

Octopus.prototype.getWikiArticles = function(){
	var octo = this;
	var place = this.currentPlace();
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
				console.log(data);
				place.articles = [];
				data.query.search.forEach(function(article){
					var obj = {};
					obj.title = article.title;
					obj.snippet = article.snippet;
					place.articles.push(obj);
				});
				octo.setCurrentPlace(octo.currentPlace());
			}
		});
	} else {
		//let knockout do the work
	}
};

Octopus.prototype.getImages = function(){
	var octo = this;
	var place = this.currentPlace();
	if(place.images === null){
		var key = '058441ee782dc38f873dc3b3dbd9ebd5';
		var url = 'https://api.flickr.com/services/rest/';

		var parameters = {
			method: 'flickr.photos.search',
			api_key: key,
			text: place.name,
			per_page: 10,
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
				octo.setCurrentPlace(octo.currentPlace());
			}
		});
	} else {
		//let knockout do the work
	}
};

/* Oh yeah.... Apply bindings!!! */
var model = new Model(rawData);
var octopus = new Octopus(model);
model.init(octopus);
ko.applyBindings(octopus);

/*
* Add event listeners for the hamburger menu
*/
$(".header").on('click','.header__hamburger',function(){
	$('.nav').toggle("0.25s");
});
$(".nav").on('click',function(){
	$('.nav').toggle();
})

/*
* Google Maps functionality
* initMap() is the callback to the Google Maps call in index.html
* Add the map as a property of octopus.
*/
function initMap() {
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
	octopus.setMap(map);
};
