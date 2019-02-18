define([
    "esri/Map",
    //"esri/views/MapView",
    "esri/views/SceneView",
    "esri/layers/VectorTileLayer",
    "esri/views/layers/LayerView",
    "esri/layers/Layer",
    "esri/widgets/Search",
    "modules/Utils",
    "dojo/domReady!"
], function(Map, SceneView, VectorTileLayer, LayerView, Layer, Search, Utils) {

    //Constructor for a new MapController
    var MapController = function (viewDiv){
        this.viewDiv = viewDiv;
    }

    //Builds the default map
    MapController.prototype.buildMap = function(){
        var that = this;
        var mapWait = $.Deferred();
        var item = "https://arcgis.com/sharing/rest/content/items/5ad3948260a147a993ef4865e3fad476";
        this.map = new Map();

        this.view = new SceneView({
            container: viewDiv,
            map: this.map,
            qualityProfile: "high",
            environment: {
              starsEnabled: false,
              atmosphereEnabled: false,
              lighting: {
                directShadowsEnabled: false,
                cameraTrackingEnabled: true,
                ambientOcclusionEnabled: false
              }
            },
            camera: {
              position: {
                spatialReference: { latestWkid: 3857, wkid: 102100 },
                x: -8240232.016157305,
                y: 4967521.10016462,
                z: 542.5048153763637
              },
              heading: 60.806845587349486,
              tilt: 70.00852977355764
            }
        });
        window.view = this.view;

        var searchWidget = new Search({
            view: this.view
        });

        this.view.ui.add(searchWidget, {
            position: "top-right",
            index: 0
        });

        var tileLyr = new VectorTileLayer({
            url: item + "/resources/styles/root.json",
            opacity:1
        });

        this.map.add(tileLyr);

        Layer.fromPortalItem({
          portalItem: {
            id: "2e0761b9a4274b8db52c4bf34356911e"
          }
        }).then(layer => {
          this.buildingLayer = layer;
          this.map.add(layer);
        });

        tileLyr.on("layerview-create", function (evt) {
            layerView = evt.layerView;
            //Set the original JSON style as a variable. We will need to revert to this each time we update the map's style
            that.originalStyle = JSON.stringify(layerView.layer.styleRepository.styleJSON);

            mapWait.resolve();
        });
        return mapWait.promise();
    }

    //Takes a palette object and applies it to the map
    MapController.prototype.applyPalette = function(palette){
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

        this.buildingLayer.renderer = {
          type: "simple",
          symbol: {
            type: "mesh-3d",
            symbolLayers: [
              {
                type: "fill",
                material: {
                  color: dict[array[12]],
                  colorMixMode: "replace"
                },
                edges: {
                  type: "solid",
                  color: palette.colours[2],
                  size: 0.6
                }
              }
            ]
          }
        };
        this.view.environment.background = {
          type: "color",
          color: palette.colours[2],
        };
    }

    MapController.prototype.hideMap = function(){

    }
    MapController.prototype.showMap = function(){

    }

    //Stuff to make public
    return {
        MapController: MapController

    };
});
