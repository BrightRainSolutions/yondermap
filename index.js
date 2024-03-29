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
            // by convention we are using 'start' and 'end'
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
                bearing: "",
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
        // for the horse model
        // the mapbox custom later that contains the horse model
        thatHorseLayer: null,
        modelAsMercatorCoordinate: null,
        modelTransform: null,
        modelX: -105.5,
        modelY: 40,
        modelRotate: [],
        mesh: null,
        mixer: null,
        camera: null,
        scene: null,
        theta: 0,
        prevTime: Date.now(),
        // core mapbox directions component
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
                center: [-96, 45],
                // ToDo: for the horse
                //center: [this.modelX, this.modelY],
                zoom: 4,
                pitch: 10,
                bearing: 0
            });

            this.directionsThing = new MapboxDirections({
                accessToken: mapboxgl.accessToken,
                steps: false,
                controls: {instructions: false, profileSwitcher: false},
                placeholderOrigin: 'where y`all startin from?',
                placeholderDestination: 'where y`all wanna go?',
                styles: this.directionsStyleOptions
            });
            this.map.addControl(this.directionsThing, 'top-right');

            // ToDo: the horse is hard, wip
            //this.setupThatHorse();

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
            
            this.map.on('zoom', () => {
              let zoom = this.map.getZoom().toFixed(2);
              //this.scaleThatHorse(zoom);
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
            let thatFirstManeuver = steps[0].maneuver;
            this.locationData.geometry.coordinates = thatFirstManeuver.location;
            this.map.getSource('step-location-source').setData(this.locationData);
            // place and scale that horse
            //this.giddyUpHorse(thatFirstManeuver.location[0], thatFirstManeuver.location[1], thatFirstManeuver.bearing_after);
            //this.scaleThatHorse(this.map.getZoom().toFixed(2));
            
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
                // create a step with only what we need to push it in our data
                // including the bearing after the manuever so we can point that horse the right way
                this.steps.push(
                    {
                        instructions: themWords,
                        icon: iconPath,
                        location: location,
                        bearing: step.maneuver.bearing_after,
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
            // this horse is wip...
            //this.giddyUpHorse(step.location[0], step.location[1], step.bearing);
            //console.log("manuever bearing " + step.bearing);
            //this.map.getSource('step-location-source').setData(this.locationData);
        },
        giddyUpHorse(x, y, heading) {
          this.modelX = x;
          this.modelY = y;
          this.modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
              [this.modelX, this.modelY],
              0
          );
  
          // transformation parameters to position, rotate and scale the 3D model onto the map
          
          this.modelTransform = {
              translateX: this.modelAsMercatorCoordinate.x,
              translateY: this.modelAsMercatorCoordinate.y,
              translateZ: this.modelAsMercatorCoordinate.z,
              rotateX: this.modelRotate[0],
              //rotateY: (heading - 90),
              rotateY: this.modelRotate[1],
              rotateZ: this.modelRotate[2],
              /* Since our 3D model is in real world meters, a scale transform needs to be
              * applied since the CustomLayerInterface expects units in MercatorCoordinates.
              */
              scale: this.modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
          };

          this.mesh.rotation.y = THREE.Math.degToRad(heading);
        },
        scaleThatHorse(zoom) {
          let scaleFactor = 1;
              if(zoom >= 13) {
                  scaleFactor = 2;
              }
              else if(zoom >= 12 && zoom < 13) {
                  scaleFactor = 12;
              }
              else if(zoom >= 11 && zoom < 12) {
                  scaleFactor = 16;
              }
              else if(zoom >= 10 && zoom < 11) {
                  scaleFactor = 25;
              }
              else if(zoom >= 9 && zoom < 10) {
                  scaleFactor = 50;
              }
              else if(zoom >= 8 && zoom < 9) {
                  scaleFactor = 70;
              }
              else if(zoom >= 7 && zoom < 8) {
                  scaleFactor = 90;
              }
              else if(zoom >= 8 && zoom < 9) {
                  scaleFactor = 120;
              }
              else if(zoom >= 7 && zoom < 8) {
                  scaleFactor = 150;
              }
              else if(zoom >= 6 && zoom < 7) {
                  scaleFactor = 200;
              }
              else if(zoom >= 5 && zoom < 6) {
                  scaleFactor = 250;
              }
              else if(zoom >= 4 && zoom < 5) {
                  scaleFactor = 350;
              }
              else if(zoom >= 3 && zoom < 4) {
                  scaleFactor = 500;
              }
              else {
                  scaleFactor = 600;
              }
              this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
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
              //this.map.getSource('step-location-source').setData(this.locationData);
              //this.giddyUpHorse(longitude, latitude, 0);

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
        },
        setupThatHorse() {
          // parameters to ensure the model is georeferenced correctly on the map
          // and that our horse is actually standing on the ground via PI !
          this.modelRotate = [Math.PI / 2, 0, 0];
          this.modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat([this.modelX, this.modelY], 0);

          // transformation parameters to position, rotate and scale the 3D model onto the map
          this.modelTransform = {
              translateX: this.modelAsMercatorCoordinate.x,
              translateY: this.modelAsMercatorCoordinate.y,
              translateZ: this.modelAsMercatorCoordinate.z,
              rotateX: this.modelRotate[0],
              rotateY: this.modelRotate[1],
              rotateZ: this.modelRotate[2],
              /* Since our 3D model is in real world meters, a scale transform needs to be
              * applied since the CustomLayerInterface expects units in MercatorCoordinates.
              */
              scale: this.modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
          };

          var THREE = window.THREE;
          
          // configuration of the custom layer for a 3D model per the CustomLayerInterface
          this.thatHorseLayer = {
              id: '3d-model',
              type: 'custom',
              renderingMode: '3d',
              onAdd: (map, gl) => {
                  this.camera = new THREE.Camera();
                  this.scene = new THREE.Scene();

                  // create two three.js lights to illuminate the model
                  var directionalLight = new THREE.DirectionalLight(0xffffff);
                  directionalLight.position.set(0, -70, 100).normalize();
                  this.scene.add(directionalLight);

                  var directionalLight2 = new THREE.DirectionalLight(0xffffff);
                  directionalLight2.position.set(0, 70, 100).normalize();
                  this.scene.add(directionalLight2);

                  let yonderVue = this;
                  // use the three.js GLTF loader to add the 3D model to the three.js scene
                  var loader = new THREE.GLTFLoader();
                  loader.load('https://assets.codepen.io/1053746/horse.glb',
                      function (gltf) {
                        yonderVue.scene.add(gltf.scene);
                        yonderVue.mesh = gltf.scene.children[0];
                        yonderVue.mesh.scale.set(500, 500, 500);
                        yonderVue.scene.add(yonderVue.mesh);

                        yonderVue.mixer = new THREE.AnimationMixer(yonderVue.mesh);

                        yonderVue.mixer
                          .clipAction(gltf.animations[0])
                          .setDuration(1).play();
                        yonderVue.scaleThatHorse(yonderVue.map.getZoom().toFixed(2));
                      }.bind(yonderVue.thatHorseLayer)
                  );

                  // use the Mapbox GL JS map canvas for three.js
                  this.thatHorseLayer.renderer = new THREE.WebGLRenderer({
                      canvas: this.map.getCanvas(),
                      context: gl,
                      antialias: true
                  });

                  this.thatHorseLayer.renderer.autoClear = false;
              },
              // method fired on each animation frame
              // https://docs.mapbox.com/mapbox-gl-js/api/#map.event:render
              render: (gl, matrix) => {
                  var rotationX = new THREE.Matrix4().makeRotationAxis(
                      new THREE.Vector3(1, 0, 0),
                      this.modelTransform.rotateX
                  );
                  var rotationY = new THREE.Matrix4().makeRotationAxis(
                      new THREE.Vector3(0, 1, 0),
                      this.modelTransform.rotateY
                  );
                  var rotationZ = new THREE.Matrix4().makeRotationAxis(
                      new THREE.Vector3(0, 0, 1),
                      this.modelTransform.rotateZ
                  );

                  var m = new THREE.Matrix4().fromArray(matrix);

                  this.modelTransform.scale = this.modelAsMercatorCoordinate.meterInMercatorCoordinateUnits();

                  var l = new THREE.Matrix4()
                      .makeTranslation(
                        this.modelTransform.translateX,
                        this.modelTransform.translateY,
                        this.modelTransform.translateZ
                      )
                      .scale(
                          new THREE.Vector3(
                            this.modelTransform.scale,
                            -this.modelTransform.scale,
                            this.modelTransform.scale
                          )
                      )
                      .multiply(rotationX)
                      .multiply(rotationY)
                      .multiply(rotationZ);

                  this.camera.projectionMatrix = m.multiply(l);
                  this.thatHorseLayer.renderer.resetState();
                  this.thatHorseLayer.renderer.render(this.scene, this.camera);
                  this.map.triggerRepaint();
                  this.theta += 0.1;
                  this.camera.position.x = Math.sin( THREE.MathUtils.degToRad( this.theta ) );
                  this.camera.position.z = Math.cos( THREE.MathUtils.degToRad( 500 ) );
                  this.camera.lookAt( 0, 0, 0 );
                  if (this.mixer) {
                      const time = Date.now();
                      this.mixer.update( ( time - this.prevTime ) * 0.001 );
                      this.prevTime = time;
                  }
              }
          };

          this.map.on('style.load', () => {
              this.map.addLayer(this.thatHorseLayer);
              // scale the horse by initial zoom
              this.scaleThatHorse(this.map.getZoom().toFixed(2));
          });
        }
    }
});