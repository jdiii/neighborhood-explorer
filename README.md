# Tour Boston!

## Installation
  1. `git clone`
  2. open `index.html` in your favorite web browser

## What does it do?
  1. A Google Map displays popular historical locations in Boston.
  2. Upon clicking a location, you will see links to articles about the location (courtesy of the Wikipedia API) and (hopefully) relevant from the Flickr API.

## Code structure?

### Model
A Model object loads "rawData" which is stored in the main.js file

### ViewModel
The ViewModel (called octopus in the code) handles a few things:
  * generating the Google map, map markers, and info windows
  * keeping track of the locations that should be displayed
  * handling AJAX requests to Flickr, Wikipedia, and Geocode APIs
  * performing text searches against the location data

### View
Knockout.js is used to generate content in the UI
