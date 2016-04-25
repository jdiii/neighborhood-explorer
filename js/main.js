var Place = function(name,address,type,comment){
	this.title = title;
	this.address = address;
	this.comment = null;
	this.type = null;
}
Place.prototype.addIntegrations = function(integrations){
	this.integrations = integrations;
	return this;
};


function initMap() {
	var height = $(window).height();
	$('#mapContainer').height(height);
	var styles = [
	  {
	    stylers: [
	      /*{ hue: "#3299BB" },*/
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
		zoom: 16,
		styles: styles,
		mapTypeId: google.maps.MapTypeId.TERRAIN
	});
};
