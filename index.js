new Vue({
    el: "#app",
    template: `
    <div id="appWrapper">
    <span @click="getLink" id="shareThatLink">send this route to yer pardner</span>    
    <div id="map"></div>
        <div id="panel" class="panel">
            <div id="header" class="has-text-centered">    
              <div id="min" @click="handlePanelMin">
                <img src="./assets/min.png" width="40px" title="hide">
              </div>  
              <div class="is-size-3">YONDER MAP</div>
              <div class="is-size-6">changing the way you make yer way over yonder</div>
              <div id="duration" class="is-size-6 is-gray" v-show="duration != ''">
                  {{ duration }}</span>
              </div>
            </div>
            <div v-show="minPanel===false" id="directions">
                <ul v-show="steps.length>1" id="directionsContainer">
                    <li v-bind:class="{ selected: step.selected }"
                        @click="goTo(step)"
                        v-for="step in steps"
                        class="directions-list-item">
                        <div class="level">    
                            <div class="level-left">
                                <div class="level-item">
                                    <img :src="step.icon" class="direction-icon level-item" />
                                </div>
                            </div>    
                            <div class="level-right">    
                                <span class="direction-words level-item">{{ step.instructions }}</span>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        <button id="locate" @click="findEm" class="yonderbtn">
            <img src="./assets/locate.png" width="40px" title="WHERE M I?!">
        </button>    
        <span v-show="showLink" id="showLink">
            <input type="text" id="link" :value="link" class="yonderinput">
            <button id="copyLinkBtn" @click="copyLink" class="yonderbtn">COPY</button>
        </span>
        <div v-show="notify" id="yonderNotify" class="yonder-notify">{{ notice }}</div>
        <button id="about" @click="showAbout = true" class="yonderbtn">
            <img src="./assets/info.png" width="40px" title="WHO R U?!">
        </button>  
        <div class="modal" v-bind:class="{ 'is-active': showAbout }" style="z-index: 99999">
          <div class="modal-background"></div>
          <div class="modal-card">
            <header class="modal-card-head">
              <p class="modal-card-title">Yondermap</p>
              <button  @click="showAbout = false" class="delete" aria-label="close"></button>
            </header>
            <section class="modal-card-body">
              <a href="https://brightrain.com" target="_blank">
                <img class="is-pulled-right" src="./assets/brightrain.png" width="200px">
              </a>
              <img src="./assets/cow-moji.png" width="100px">
              <img src="./assets/cactus.png" width="100px">
              <img src="./assets/cowboy.png" width="100px">
              <p>
              Well howdy pardner and much obliged for stoppin by. 
              This here site is brought to you by 
                <a href="https://brightrain.com" id="brsLink" target="_blank">Bright Rain Solutions</a>.
                Giddy up and see you round the bend.
              </p>
            </section>
            <footer class="modal-card-foot">
              <button @click="showAbout = false" class="yonderbtn">Gotchya</button>
            </footer>
          </div>
        </div>
    </div>
    `,
    mounted() {
        this.init();
        // check to see if there are parameters in the url
        const queryString = window.location.search;
        if (queryString !== "") {
            // if we have url params get them
            const urlParams = new URLSearchParams(queryString);
            // by convention we are using 'origin' and 'destination'
            const start = urlParams.get('start');
            const end = urlParams.get('end');
            // if we got them then set corresponding local data and the route will
            // be triggered once the map is loaded (in the map load event)
            if(start !== "" && end !=="") {
                this.origin = start;
                this.destination = end;
                //trackEvent(category, action, [name], [value])
                _paq.push(['trackEvent', 'Route', 'FromURL']);
            }
            
        } 
    },
    data: {
        steps: [
            {
                instructions: "",
                icon: "",
                location: [],
                selected: false
            }
        ],
        duration: "",
        map: {},
        locationData: {
            "geometry": {
                "type": "Point",
                "coordinates": [
                -105.5,
                40
                ]
            },
            "type": "Feature",
            "properties": {}
        },
        directionsThing: null,
        origin: "",
        destination: "",
        link: "",
        showLink: false,
        notify: false,
        notice: "",
        showAbout: false,
        minPanel: false,
        directionsStyleOptions: [{
            'id': 'directions-route-line-alt',
            'type': 'line',
            'source': 'directions',
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#bbb',
              'line-width': 4
            },
            'filter': [
              'all',
              ['in', '$type', 'LineString'],
              ['in', 'route', 'alternate']
            ]
          }, {
            'id': 'directions-route-line-casing',
            'type': 'line',
            'source': 'directions',
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#956B28',
              'line-width': 12
            },
            'filter': [
              'all',
              ['in', '$type', 'LineString'],
              ['in', 'route', 'selected']
            ]
          }, {
            'id': 'directions-route-line',
            'type': 'line',
            'source': 'directions',
            'layout': {
              'line-cap': 'butt',
              'line-join': 'round'
            },
            'paint': {
              'line-color': {
                'property': 'congestion',
                'type': 'categorical',
                'default': '#B69C72',
                'stops': [
                  ['unknown', '#4882c5'],
                  ['low', '#4882c5'],
                  ['moderate', '#f09a46'],
                  ['heavy', '#e34341'],
                  ['severe', '#8b2342']
                ]
              },
              'line-width': 7
            },
            'filter': [
              'all',
              ['in', '$type', 'LineString'],
              ['in', 'route', 'selected']
            ]
          }, {
            'id': 'directions-hover-point-casing',
            'type': 'circle',
            'source': 'directions',
            'paint': {
              'circle-radius': 8,
              'circle-color': '#fff'
            },
            'filter': [
              'all',
              ['in', '$type', 'Point'],
              ['in', 'id', 'hover']
            ]
          }, {
            'id': 'directions-hover-point',
            'type': 'circle',
            'source': 'directions',
            'paint': {
              'circle-radius': 6,
              'circle-color': '#B69C72'
            },
            'filter': [
              'all',
              ['in', '$type', 'Point'],
              ['in', 'id', 'hover']
            ]
          }, {
            'id': 'directions-waypoint-point-casing',
            'type': 'circle',
            'source': 'directions',
            'paint': {
              'circle-radius': 8,
              'circle-color': '#fff'
            },
            'filter': [
              'all',
              ['in', '$type', 'Point'],
              ['in', 'id', 'waypoint']
            ]
          }, {
            'id': 'directions-waypoint-point',
            'type': 'circle',
            'source': 'directions',
            'paint': {
              'circle-radius': 6,
              'circle-color': '#956B28'
            },
            'filter': [
              'all',
              ['in', '$type', 'Point'],
              ['in', 'id', 'waypoint']
            ]
          }, {
            'id': 'directions-origin-point',
            'type': 'circle',
            'source': 'directions',
            'paint': {
              'circle-radius': 18,
              'circle-color': '#956B28'
            },
            'filter': [
              'all',
              ['in', '$type', 'Point'],
              ['in', 'marker-symbol', 'A']
            ]
          }, {
            'id': 'directions-origin-label',
            'type': 'symbol',
            'source': 'directions',
            'layout': {
              'text-field': 'A',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12
            },
            'paint': {
              'text-color': '#fff'
            },
            'filter': [
              'all',
              ['in', '$type', 'Point'],
              ['in', 'marker-symbol', 'A']
            ]
          }, {
            'id': 'directions-destination-point',
            'type': 'circle',
            'source': 'directions',
            'paint': {
              'circle-radius': 18,
              'circle-color': '#B69C72'
            },
            'filter': [
              'all',
              ['in', '$type', 'Point'],
              ['in', 'marker-symbol', 'B']
            ]
          }, {
            'id': 'directions-destination-label',
            'type': 'symbol',
            'source': 'directions',
            'layout': {
              'text-field': 'B',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12
            },
            'paint': {
              'text-color': '#fff'
            },
            'filter': [
              'all',
              ['in', '$type', 'Point'],
              ['in', 'marker-symbol', 'B']
            ]
          }]
    },
    methods: {
        init() {
            mapboxgl.accessToken = 'pk.eyJ1IjoiYnJpZ2h0cmFpbiIsImEiOiJjazFwdjJoZmExMWQzM2Vwc3dsc2swc2d5In0.6LCQE5exyPG5f1uWzDJSBQ';
            this.map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/brightrain/cjrmcme6m0kwp2sjz5qvez9ga',
                center: [-110, 40],
                zoom: 3,
                maptiks_id: "yondermap",
            });

            this.directionsThing = new MapboxDirections({
                accessToken: mapboxgl.accessToken,
                steps: false,
                geometries: 'polyline',
                controls: {instructions: false, profileSwitcher: false},
                placeholderOrigin: 'where y`all startin from?',
                placeholderDestination: 'where y`all wanna go?',
                styles: this.directionsStyleOptions
            });
            
            this.map.addControl(this.directionsThing, 'top-right');

            // when the map is loaded setup our route event
            this.map.on('load', () => {
                // Listen for the `directions.route` event then populate our directions panel
                this.directionsThing.on('route', ev => {
                    _paq.push(['trackEvent', 'Route', 'RouteRequested']);
                    let originCoords = this.directionsThing.getOrigin().geometry.coordinates;
                    this.origin = originCoords[0].toString() + "," + originCoords[1].toString();
                    let destCoords = this.directionsThing.getDestination().geometry.coordinates;
                    this.destination = destCoords[0].toString() + "," + destCoords[1].toString();
                    this.yonderThatRoute(ev);
                });

                // set current url to our link
                this.link = window.location;

                // if origin and destination parameters were passed set them here
                if(this.origin !== "" && this.destination !== "") {
                    this.directionsThing.setOrigin(this.origin);
                    this.directionsThing.setDestination(this.destination);
                }
                
                // add the layer for the step location that we will display
                // when user clicks one of the steps in the list
                // we will simply update the location of this with each click
                this.map.addSource('step-location-source', { type: 'geojson', data: this.locationData });
                // the image to be used for the step location marker
                this.map.loadImage('assets/stump.png', (error, image) => {
                    if (error) throw error;
                    this.map.addImage('step-icon', image);
                    
                    this.map.addLayer({
                        'id': 'step-location',
                        'type': 'symbol',
                        'source': 'step-location-source',
                        'layout': {
                        'icon-image': 'step-icon',
                        'icon-size': 0.5
                        }
                    });
                });
            });            
        },
        yonderThatRoute(ev) {
            // clear existing steps
            this.steps = [];
            // iterate all legs and get all steps from all legs
            let steps = [];
            ev.route[0].legs.forEach(leg => {
                leg.steps.forEach(s => {
                    steps.push(s);
                });
            });

            // place our step marker at the first step
            this.locationData.geometry.coordinates = steps[0].maneuver.location;
            this.map.getSource('step-location-source').setData(this.locationData);
            
            // iterate steps from the route to create our steps
            // for direction panel
            steps.forEach(step => {
                let instructions = step.maneuver.instruction;
                // grab the location for this maneuver and store it so
                // we can zoom to it when a user clicks this step in the list
                let location = step.maneuver.location;
                // yonder up them words
                let themWords = this.swapOutThemWords(instructions);
                let iconPath = this.getThatIcon(instructions);

                this.steps.push(
                    {
                        instructions: themWords,
                        icon: iconPath,
                        location: location,
                        selected: false
                    }
                );

                // duration to display
                let minutes = Math.floor(ev.route[0].duration / 60);
                if(minutes < 60) {
                    this.duration = "It's just down the road a piece bout " + 
                    minutes + " minutes";
                }
                else {
                    var hours = Math.floor(minutes / 60);  
                    var mins = minutes % 60;
                    this.duration = "It'll take ya'll " + 
                        hours + " hours and " +
                        mins + " minutes ta git thar";
                }
            });
        },
        swapOutThemWords(instructions) {
            return instructions
                .replace(/head/g, "yonder")
                .replace(/Head/g, "Yonder")
                .replace(/Turn left/g, "Hang a Louie")
                .replace(/Turn right/g, "Hang a Ralph")
                .replace(/Head/g, "Yonder")
                .replace(/Take a slight/g, "Mosey on over to the")
                .replace(/take a slight/g, "mosey on over to the")
                .replace(/Take/g, "Giddy up on")
                .replace(/take/g, "giddy up on")
                .replace(/Make a slight/g, "Mosey over to the")
                .replace(/Make/g, "Go'on and do")
                .replace(/Enter the/g, "Go'on that thar")
                .replace(/Keep/g, "Stay")
                .replace(/Merge/g, "Join along")
                .replace(/You have arrived at your destination/g, "Y'all are there")
                .replace(/on the/g, "over thar on the")
                .replace(/,/g, "")
        },
        getThatIcon(instructions) {
            let iconPath = "";
            if(instructions.includes("left")) {
                iconPath = "assets/left.png"
            }
            else if (instructions.includes("right")) {
                iconPath = "assets/right.png"
            }
            else if (instructions.includes("straight")) {
                iconPath = "assets/straight.png"
            }
            else if (instructions.includes("Head")) {
                iconPath = "assets/straight.png"
            }
            else if (instructions.includes("head")) {
                iconPath = "assets/straight.png"
            }
            else if (instructions.includes("U-turn")) {
                iconPath = "assets/uturn.png"
            }
            else if (instructions.includes("merge")) {
                iconPath = "assets/merge.png"
            }
            else if (instructions.includes("destination")) {
                iconPath = "assets/destination.png"
            }
            else {
                iconPath = "assets/compass.png"
            }
            return iconPath;
        },
        goTo(step) {
            this.steps.forEach(step => { step.selected=false; });
            step.selected = true;
            //  [-105.096323, 40.587368]
            this.map.flyTo({
                center: step.location,
                zoom: 14,
                speed: 1.5,
                curve: 1,
                easing(t) {
                  return t;
                }
            });
            // place the marker at the step location
            this.locationData.geometry.coordinates = step.location;
            this.map.getSource('step-location-source').setData(this.locationData);
        },
        getLink() {
            if(this.steps.length > 1) {
            this.link = window.location.protocol + "//" + window.location.hostname + 
                "?start=" + this.origin + "&end=" + this.destination;
            this.showLink = true;
            }
            else {
                this.notice = 'Whoooa there, you gotta tell us where yer goin first!';
                this.notify = true;
                setTimeout(() => { this.notify = false; }, 3000);
            }
        },
        copyLink() {
            let linkEl = document.getElementById('link')
            linkEl.setAttribute('type', 'text')
            linkEl.select()
            var success = document.execCommand('copy');
            // hide the link box
            this.showLink = false;
            this.notice = 'Pardner link copied!';
            this.notify = true;
            setTimeout(() => { this.notify = false; }, 3000);
            _paq.push(['trackEvent', 'Route', 'CopyRouteLink']);
          },
          findEm() {
            _paq.push(['trackEvent', 'Locate', 'LocateBtn']);
            navigator.geolocation.getCurrentPosition(position => {
                const latitude  = position.coords.latitude;
                const longitude = position.coords.longitude;
                
                // place the marker at the location
                this.locationData.geometry.coordinates = [longitude, latitude];
                this.map.getSource('step-location-source').setData(this.locationData);

                // set it as the origin of a route
                this.directionsThing.setOrigin([longitude, latitude]);

                this.map.flyTo({
                    center: [longitude, latitude],
                    zoom: 14,
                    speed: 1.5,
                    curve: 1,
                    easing(t) {
                      return t;
                    }
                });
            });
          },
          handlePanelMin() {
            this.minPanel = !this.minPanel;
            document.getElementById("panel").classList.toggle("min-panel");
          }
    }
});