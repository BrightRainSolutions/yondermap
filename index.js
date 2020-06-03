new Vue({
    el: "#app",
    template: `
    <div id="appWrapper">
        <div id="map"></div>
        <div id="panel" class="panel">
            <div id="header" class="is-size-3 has-text-centered">    
                YONDER MAP
                <div class="is-size-6">changing the way you make yer way over yonder</div>
                    <div id="duration" class="is-size-6 is-gray" v-show="duration != ''">
                        {{ duration }}</span>
                    </div>
                </div>
            <div id="directions">
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
    </div>
    `,
    mounted() {
        this.init();
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
        }
    },
    methods: {
        init() {
            mapboxgl.accessToken = 'pk.eyJ1IjoiYnJpZ2h0cmFpbiIsImEiOiJjazFwdjJoZmExMWQzM2Vwc3dsc2swc2d5In0.6LCQE5exyPG5f1uWzDJSBQ';
            this.map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/brightrain/cjrmcme6m0kwp2sjz5qvez9ga'
            });

            var directions = new MapboxDirections({
                accessToken: mapboxgl.accessToken,
                steps: false,
                geometries: 'polyline',
                controls: {instructions: false}
            });
            
            this.map.addControl(directions, 'top-right');
            
            this.map.on('load', () => {
                // Listen for the `directions.route` event then populate our directions panel
                directions.on('route', ev => {
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
                });

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
        goTo(step) {
            this.steps.forEach(step => { step.selected=false; });
            step.selected = true;
            //  [-105.096323, 40.587368]
            this.map.flyTo({
                center: step.location,
                zoom: 12,
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
        }
    }
});