//The Utils module contains all the functions that are used by, 
//but do not directly affect the MapController or Palette

define(["modules/color-thief.min", "modules/rainbowvis"], function() {

    //Function to convert image URLs to base64
    var imageToBase64 = function(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            var reader = new FileReader();
            reader.onloadend = function() {
                callback(reader.result);
            }
            reader.readAsDataURL(xhr.response);
        };
        xhr.open('GET', url);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status != 200) {
                    callback("error");
                }
            }
        };
        xhr.responseType = 'blob';
        xhr.send();
    }

    var imageToColours = function(image, numberOfColours) {
        var dfd = $.Deferred();
        if (image.startsWith("data:image")) {

            var img = document.createElement('img');
            img.setAttribute("src", image);
            img.addEventListener('load', function() {
                var colorThief = new ColorThief();
                //Request ColorThief to return a palette of five colours from the image that we can use to update the map's style
                var colorThiefColors = colorThief.getPalette(img, numberOfColours);
                if (colorThiefColors != null) {
                    //Update the canvas to display the image preview
                    updateCanvas($(img).attr('src'));
                }
                for (var colors in colorThiefColors) {
                    colorThiefColors[colors] = rgbToHex(colorThiefColors[colors][0], colorThiefColors[colors][1], colorThiefColors[colors][2]);
                }
                dfd.resolve(colorThiefColors);
            });
        } else {
            dfd.resolve("error");
        }
        return dfd.promise();
    }

    var updateCanvas = function(imagesrc) {
        var canvas = document.getElementById("c");
        var cardContent = document.getElementsByClassName("card-content")[0];
        canvas.width = cardContent.clientWidth;
        canvas.height = cardContent.clientHeight;
        var ctx = canvas.getContext("2d");
        var image = new Image();
        image.onload = function() {
            ctx.clearRect(0, 0, cardContent.clientWidth, cardContent.clientHeight);
            var wrh = image.width / image.height;
            var newWidth = cardContent.clientWidth;
            var newHeight = newWidth / wrh;
            if (newHeight > cardContent.clientHeight) {
                newHeight = cardContent.clientHeight;
                newWidth = newHeight * wrh;
            }
            offset = 0;
            if (newWidth < cardContent.clientWidth) {
                offset = (cardContent.clientWidth / 2) - (newWidth / 2);
            }
            if (newWidth > newHeight) {}
            ctx.drawImage(image, offset, 0, newWidth, newHeight);
        };
        image.src = imagesrc;
    }

    //Function for converting component colour values to hex
    var componentToHex = function(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    //Function to convert RGB colour value to hex
    var rgbToHex = function(r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    // Function to convert hex color strings to RGB values
    var hexToRgb = function(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
     * 
     * Converts an RGB color value to HSV. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h, s, and v in the set [0, 1].
     *
     * @param   Number  r       The red color value
     * @param   Number  g       The green color value
     * @param   Number  b       The blue color value
     * @return  Array           The HSV representation
     */
    var rgbToHsv = function(r, g, b) {
        r = r / 255, g = g / 255, b = b / 255;
        var max = Math.max(r, g, b),
            min = Math.min(r, g, b);
        var h, s, v = max;

        var d = max - min;
        s = max == 0 ? 0 : d / max;

        if (max == min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return [h, s, v];
    }

    //Function to do a find and replace in the style JSON to replace original colour values with new ones
    function stringReplace(str, replaceWhat, replaceTo) {
        replaceWhat = replaceWhat.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var re = new RegExp(replaceWhat, 'gi');
        return str.replace(re, replaceTo);
    }

    //Generate a colour ramp between two colours using RainbowVIS-JS - https://github.com/anomal/RainbowVis-JS
    function getColourRamp(baseColors, first, last) {
        // get all colors we want to replace in the original basemap

        // create mapping between hex color and it's HSV value
        var minValue = 1;
        var maxValue = 0;
        var colorValues = {};
        baseColors.forEach(function(color) {
            var rgb = hexToRgb(color);
            var hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
            var value = Math.round(rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722) / 255;
            //var value = hsv[1] + hsv[2];
            minValue = Math.min(value, minValue);
            maxValue = Math.max(value, maxValue);

            colorValues[color] = value;
        });
        var colors = Object.keys(colorValues);

        // sort colors according to their value
        colors.sort(function(colorA, colorB) { return colorValues[colorA] - colorValues[colorB]; });

        //Use the number of colours in the dark gray canvas vector tile colour array to define how many colours in the generated colour ramp
        var numberOfItems = colors.length;
        var rainbow = new Rainbow();
        rainbow.setNumberRange(1, 100);
        rainbow.setSpectrum(first, last);

        var dict = [];
        colors.forEach(function(color) {
            var value = colorValues[color];
            var rainbowIndex = Math.ceil(100 / (maxValue - minValue) * (value - minValue));
            dict[color] = "#" + rainbow.colourAt(rainbowIndex);

            console.log(color + ' %cWWWWWWWWW%cWWWWWWWWW%c ' + dict[color], 'background: ' + color + '; color: ' + color, 'background: ' + dict[color] + '; color: ' + dict[color], 'color: black; background: white;');
        });
        return dict;
    }

    function getBaseColourArray() {
        // All colors we want to replace in the original base map
        return ["#1d2224", "#212121", "#222628", "#262525", "#272a2b", "#292828", "#2a2b2b",
            "#2b2e2f", "#2d2e2e", "#2f3030", "#2a2c2b", "#2d2e2e", "#2e2f2f", "#303131", "#323333",
            "#333232", "#343635", "#353636", "#373837", "#373838", "#373938", "#383939", "#3f4040",
            "#3a3b3a", "#3a3b3b", "#3b3b3b", "#3b3c3c", "#3c3e3d", "#404040", "#404140", "#414242",
            "#434444", "#444545", "#4a4c4c", "#4c4d49", "#515252", "#656564", "#707374", "#727271",
            "#808080", "#838381", "#8c8e8d", "#a3a3a1", "#d6d8d4", "#e1e3de", "#ebe8e8", "#ffffff"
        ];
    }

    //Stuff to make public
    return {
        imageToBase64: imageToBase64,
        imageToColours: imageToColours,
        componentToHex: componentToHex,
        rgbToHex: rgbToHex,
        stringReplace: stringReplace,
        getColourRamp: getColourRamp,
        getBaseColourArray: getBaseColourArray,
        updateCanvas: updateCanvas
    };

});