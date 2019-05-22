define([
    "esri/Map",
    "esri/views/MapView",
    "esri/views/SceneView",
    "esri/layers/VectorTileLayer",
    "esri/widgets/Search",
    "esri/core/watchUtils",
    "esri/request",
    "modules/Utils",
    "dojo/domReady!"
], function(Map, MapView, SceneView, VectorTileLayer, Search, watchUtils, request, Utils) {

    //Constructor for a new MapController
    var MapController = function(viewDiv) {
        this.viewDiv = viewDiv;
    }

    //Builds the default map
    MapController.prototype.buildMap = function() {

        var that = this;
        var mapWait = $.Deferred();
        var item = "c11ce4f7801740b2905eb03ddc963ac8"; // Dark Gray Canvas (v2)
        var portalUrl = "https://arcgis.com/sharing/rest/content/items/" + item + "/resources/styles/root.json";

        if (that.originalStyle) {
            this.showMap();
            mapWait.resolve();
        } else {
            request(portalUrl, { responseType: "text" }).then((response) => {

                that.originalStyle = response.data;
                $("#show2D").click(function() {
                    that.showMap(false);
                });
                $("#show3D").click(function() {
                    that.showMap(true);
                });

                that.showMap();
                mapWait.resolve();
            }).catch(console.error);
        }
        // We have to load the 

        return mapWait.promise();
    }

    MapController.prototype.showMap = function(showGlobe) {

        // Try to restore previous style
        var style;
        if (this.map) {
            style = this.map.layers.getItemAt(0).currentStyleInfo;
        } else {
            style = JSON.parse(this.originalStyle);
            this.baseColors = retrieveColors({}, style);
        }

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
        window.view = this.view;

        var searchWidget = new Search({
            view: this.view
        });

        this.view.ui.add(searchWidget, {
            position: "top-right",
            index: 0
        });

        // var tileLyr = new VectorTileLayer({
        //     url: item + "/resources/styles/root.json",
        //     opacity: 1
        // });

        // this.map.add(tileLyr);

        var tileLyr = new VectorTileLayer({
            style: style,
            opacity: 1
        });
        this.map.add(tileLyr);

        if (showGlobe) {
            this.map.ground.surfaceColor = document.body.style.background;
            watchUtils.whenNotOnce(this.view, "updating", function() {
                this.view.goTo({
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
    }

    //Takes a palette object and applies it to the map
    MapController.prototype.applyPalette = function(palette) {

        var colorRamp = Utils.getColourRamp(this.baseColors, palette.colours[0], palette.colours[1]);
        document.body.style.background = palette.colours[0];

        // for (var i = 0; i < array.length; i++) {
        //     style = Utils.stringReplace(style, '"background-color":"' + array[i] + '"', '"background-color":"' + dict[array[i]] + '"')
        //     style = Utils.stringReplace(style, '"fill-color":"' + array[i] + '"', '"fill-color":"' + dict[array[i]] + '"');
        //     style = Utils.stringReplace(style, '"fill-outline-color":"' + array[i] + '"', '"fill-outline-color":"' + dict[array[i]] + '"');
        //     style = Utils.stringReplace(style, '"line-color":"' + array[i] + '"', '"line-color":"' + palette.colours[2] + '"');
        //     style = Utils.stringReplace(style, '"text-color":"' + array[i] + '"', '"text-color":"' + palette.colours[3] + '"');
        //     style = Utils.stringReplace(style, '"text-halo-color":"' + array[i] + '"', '"text-halo-color":"' + palette.colours[4] + '"');
        // }
        var newStyle = JSON.parse(this.originalStyle);
        var newStyle = rewriteStyle(newStyle, colorRamp, palette.colours[2], palette.colours[3], colorRamp[this.baseColors[0]]); //palette.colours[4]); //  JSON.parse(style);
        window.newStyle = newStyle;
        palette.storeStyle(JSON.stringify(newStyle));

        this.map.layers.getItemAt(0).loadStyle(newStyle);

        if (this.map.ground) {
            this.map.ground.surfaceColor = palette.colours[0];
        }
    }

    function rewriteSingleColor(styleJSON, color) {
        if (typeof styleJSON === "string") {
            if (/^#[0-9A-F]{6}$/i.test(styleJSON)) {
                return color;
            }
            return styleJSON;
        } else if (Array.isArray(styleJSON)) {
            return styleJSON.map(function(json) {
                return rewriteSingleColor(json, color);
            });
        } else if (typeof styleJSON === 'object' && styleJSON !== null) {
            return Object.keys(styleJSON).reduce(function(json, key) {
                json[key] = rewriteSingleColor(styleJSON[key], color);
                return json;
            }, {});
        }
        return styleJSON;
    }

    function rewriteColorRamp(styleJSON, colorRamp) {
        if (typeof styleJSON === "string") {
            if (/^#[0-9A-F]{6}$/i.test(styleJSON) && colorRamp[styleJSON]) {
                return colorRamp[styleJSON];
            }
            return styleJSON;
        } else if (Array.isArray(styleJSON)) {
            return styleJSON.map(function(json) {
                return rewriteColorRamp(json, colorRamp);
            });
        } else if (typeof styleJSON === 'object' && styleJSON !== null) {
            return Object.keys(styleJSON).reduce(function(json, key) {
                json[key] = rewriteColorRamp(styleJSON[key], colorRamp);
                return json;
            }, {});
        }
        return styleJSON;
    }

    function rewriteStyle(styleJSON, colorRamp, lineColor, textColor, textHaloColor) {
        if (!styleJSON) {
            return styleJSON;
        } else if (Array.isArray(styleJSON)) {
            return styleJSON.map(function(json) {
                return rewriteStyle(json, colorRamp, lineColor, textColor, textHaloColor);
            });
        } else if (typeof styleJSON === 'object' && styleJSON !== null) {
            return Object.keys(styleJSON).reduce(function(json, key) {
                var value = styleJSON[key];
                if (key === "background-color" || key === "fill-color" || key === "fill-outline-color") {
                    value = rewriteColorRamp(value, colorRamp);
                } else if (key === "line-color") {
                    value = rewriteColorRamp(value, colorRamp);
                    var otherValue = rewriteSingleColor(value, lineColor);
                } else if (key === "text-color") {
                    value = rewriteColorRamp(value, colorRamp);
                    //value = rewriteSingleColor(value, textColor);
                } else if (key === "text-halo-color") {
                    value = rewriteColorRamp(value, colorRamp);
                    //value = rewriteSingleColor(value, textHaloColor);
                } else {
                    value = rewriteStyle(styleJSON[key], colorRamp, lineColor, textColor, textHaloColor);
                }
                json[key] = value;
                return json;
            }, {});
        }
        return styleJSON;
    }

    function retrieveColors(colorSet, styleJSON) {
        if (typeof styleJSON === "string") {
            if (/^#[0-9A-F]{6}$/i.test(styleJSON)) {
                colorSet[styleJSON] = true;
            }
        } else if (Array.isArray(styleJSON)) {
            styleJSON.forEach(function(child) {
                retrieveColors(colorSet, child);
            });
        } else if (styleJSON) {
            Object.keys(styleJSON).forEach(function(key) {
                retrieveColors(colorSet, styleJSON[key]);
            });
        }
        return Object.keys(colorSet);
    }

    //Stuff to make public
    return {
        MapController: MapController
    };
});