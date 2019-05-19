define([
    "esri/Map",
    "esri/views/MapView",
    "esri/views/SceneView",
    "esri/layers/VectorTileLayer",
    "esri/widgets/Search",
    "esri/core/watchUtils",
    "modules/Utils",
    "dojo/domReady!"
], function(Map, MapView, SceneView, VectorTileLayer, Search, watchUtils, Utils) {

    //Constructor for a new MapController
    var MapController = function(viewDiv) {
        this.viewDiv = viewDiv;
    }

    //Builds the default map
    MapController.prototype.buildMap = function(showGlobe) {
        
        var that = this;
        var mapWait = $.Deferred();
        var item = "https://arcgis.com/sharing/rest/content/items/c11ce4f7801740b2905eb03ddc963ac8";
        this.map = new Map();

        if (showGlobe) {
            this.view = new SceneView({
                container: this.viewDiv,
                map: this.map,
                qualityProfile: "high",
                alphaCompositingEnabled: true,
                environment: {
                    starsEnabled: false,
                    atmosphereEnabled: false,
                    lighting: {
                        directShadowsEnabled: true,
                        cameraTrackingEnabled: true,
                        ambientOcclusionEnabled: false
                    },
                    background: {
                        type: "color",
                        color: [0, 255, 0, 0],
                    }
                },
            });
            this.view.ui.add("show2D", "top-right");
        } else {
            this.view = new MapView({
                container: this.viewDiv,
                map: this.map,
                zoom: 13,
                center: [-0.010557, 51.495997]
            });
            this.view.ui.add("show3D", "top-right");
        }

        var searchWidget = new Search({
            view: this.view
        });

        this.view.ui.add(searchWidget, {
            position: "top-right",
            index: 0
        });

        var tileLyr = new VectorTileLayer({
            url: item + "/resources/styles/root.json",
            opacity: 1
        });

        this.map.add(tileLyr);

        this.view.whenLayerView(tileLyr).then(function(layerView) {
            //Set the original JSON style as a variable. We will need to revert to this each time we update the map's style
            that.originalStyle = JSON.stringify(layerView.layer.styleRepository.styleJSON);
            mapWait.resolve();

            if (showGlobe) {
                watchUtils.whenNotOnce(layerView, "updating", function() {
                    that.view.goTo({
                        position: {
                            spatialReference: {
                                latestWkid: 3857,
                                wkid: 102100
                            },
                            x: 1869631.2239427697,
                            y: 3387060.2726709265,
                            z: 2539427.781257158
                        },
                        heading: 341.57308435639214,
                        tilt: 31.590472319751388
                    });
                });
            }
        });

        return mapWait.promise();
    }

    //Takes a palette object and applies it to the map
    MapController.prototype.applyPalette = function(palette) {
        var array = Utils.getBaseColourArray();
        var style = this.originalStyle;
        var dict = Utils.getColourRamp(palette.colours[0], palette.colours[1]);
        document.body.style.background = palette.colours[0];

        for (var i = 0; i < array.length; i++) {
            style = Utils.stringReplace(style, '"background-color":"' + array[i] + '"', '"background-color":"' + dict[array[i]] + '"')
            style = Utils.stringReplace(style, '"fill-color":"' + array[i] + '"', '"fill-color":"' + dict[array[i]] + '"');
            style = Utils.stringReplace(style, '"fill-outline-color":"' + array[i] + '"', '"fill-outline-color":"' + dict[array[i]] + '"');
            style = Utils.stringReplace(style, '"text-color":"' + array[i] + '"', '"text-color":"' + palette.colours[3] + '"');
            style = Utils.stringReplace(style, '"text-halo-color":"' + array[i] + '"', '"text-halo-color":"' + palette.colours[4] + '"');
            style = Utils.stringReplace(style, '"line-color":"' + array[i] + '"', '"line-color":"' + palette.colours[2] + '"');
        }
        var newStyle = JSON.parse(style);
        palette.storeStyle(style);

        this.map.layers.items[0].loadStyle(newStyle);

        if (this.view.environment) {
            this.map.ground.surfaceColor = palette.colours[0];
        }
    }

    MapController.prototype.hideMap = function() {

    }
    MapController.prototype.showMap = function() {

    }

    //Stuff to make public
    return {
        MapController: MapController
    };
});