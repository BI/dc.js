/**
## Geo Choropleth Chart
Includes: [Color Mixin](#color-mixin), [Base Mixin](#base-mixin)

The geo choropleth chart is designed as an easy way to create a crossfilter driven choropleth map
from GeoJson data. This chart implementation was inspired by [the great d3 choropleth
example](http://bl.ocks.org/4060606).

Examples:
* [US Venture Capital Landscape 2011](http://dc-js.github.com/dc.js/vc/index.html)
#### dc.geoChoroplethChart(parent[, chartGroup])
Create a choropleth chart instance and attach it to the given parent element.

Parameters:
* parent : string | node | selection - any valid
 [d3 single selector](https://github.com/mbostock/d3/wiki/Selections#selecting-elements) specifying
 a dom block element such as a div; or a dom element or d3 selection.

* chartGroup : string (optional) - name of the chart group this chart instance should be placed in.
 Interaction with a chart will only trigger events and redraws within the chart's group.

Returns:
A newly created choropleth chart instance

```js
// create a choropleth chart under '#us-chart' element using the default global chart group
var chart1 = dc.geoChoroplethChart('#us-chart');
// create a choropleth chart under '#us-chart2' element using chart group A
var chart2 = dc.compositeChart('#us-chart2', 'chartGroupA');
```

**/
dc.geoChoroplethChart = function (parent, chartGroup) {
    var _chart = dc.colorMixin(dc.baseMixin({}));

    _chart.colorAccessor(function (d) {
        return d || 0;
    });

    var _geoPath = d3.geo.path();
    var _projectionFlag;

    var _geoJsons = [];

    var _zoom;
    var _mouseScrollZoomable = true;
    var _scaleExtent = [1,8];
    var _zoomed = zoomed;
    var _zoomButtonClass = "zoomButton";
    var _resetZoomButtonClass = "resetZoomButton";
    var _enableZoom = false;
    var _afterZoom = function(){};
    var _g;
    var _clip;
    var _panOffsetX = true;
    var _panOffsetY = true;
    var _zeroDataMessage = 'No Data';
    var _legendNumberFormat = function(n) { return Math.round(n) }
    var _showLegend = false;
    var _legendSwatchHeight = 15;
    var _legendSwatchMargin = { bottom: 5, right: 5 }
    var _legendMargin = { bottom: 50, left: 20 }
    var _getLegendHeight = function() { return (_chart.colors().range().length + 1 ) * (_legendSwatchHeight + _legendSwatchMargin.bottom) }

    _chart._doRender = function () { 
        _chart.resetSvg();
        _g = _chart.svg().append('g');
        for (var layerIndex = 0; layerIndex < _geoJsons.length; ++layerIndex) {
            var states = _g.append('g')
                .attr('class', 'layer' + layerIndex);

            var regionG = states.selectAll('g.' + geoJson(layerIndex).name)
                .data(geoJson(layerIndex).data)
                .enter()
                .append('g')
                .attr('class', geoJson(layerIndex).name);

            regionG
                .append('path')
                .attr('fill', 'white')
                .attr('d', _geoPath);

            regionG.append('title');

            plotData(layerIndex);
        }

        _projectionFlag = false;

        if (_enableZoom){
            _zoom = d3.behavior.zoom()
                .scaleExtent(_scaleExtent)
                .on("zoom", _zoomed); 

            _chart.svg().call(_zoom);

            if(!_mouseScrollZoomable)
                _chart.svg().on("wheel.zoom", null);
            
            setupZoomControls(); 
        }

        if(_showLegend) addLegend();
    };

    function addLegend() {
        var legendYPos = _chart.height() - _chart.legendHeight() - _chart.legendMargin().bottom
        var legend = _chart.svg().append('g')
            .classed('legend', true)
             .attr('transform', 'translate(' + _chart.legendMargin().left + ',' + legendYPos + ')');

        legend.append('rect')
            .classed('background', true)
            .attr('width', 170)
            .attr('height', _chart.legendHeight())
             .attr('fill', 'none');
        
        // legend.append('text')
        //     .classed('legend-title', true)
        //     .text('Legend')
        //     .attr('alignment-baseline', 'hanging')
        //     .attr('y', 10)
        //     .attr('x', 10);

        var keyContainer = legend.append('g')
            .classed('key-container', true)
            .attr('transform', 'translate(0, 0)');

        var legendColors = _chart.colors().range().slice(0).reverse();
        var zeroColor = _chart.getColor(0);
        legendColors.push(zeroColor);
        var keyRow = keyContainer.selectAll('g')
            .data(legendColors)
            .enter()
            .append('g')
            .attr('transform', function(d, i) {
                return 'translate(0, ' + String(i * (_chart.legendSwatchHeight() + _chart.legendSwatchMargin().bottom) ) + ')'
            });

        keyRow.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', _chart.legendSwatchHeight())
            .attr('width', _chart.legendSwatchHeight())
            .attr('fill', function(color) { return color });

        keyRow.append('text')
            .text(function(color) {
                return getLegendValueRange(color)
            })
            .classed('key-text', true)
            .attr('alignment-baseline', 'hanging')
            .attr('x', _chart.legendSwatchHeight() + _chart.legendSwatchMargin().right)
            .attr('y', 0);
    }

    function updateLegendText() {
        _chart.svg().select('.key-container')
            .selectAll('g text')
            .text(function(color) {
                return getLegendValueRange(color);
            });
    }

    function getLegendValueRange(color) {
        var colorValueRange = _chart.colors().invertExtent
        if(!colorValueRange(color)[0]) return _chart.zeroDataMessage();

        var startNumber = _chart.legendNumberFormat()(Math.ceil(colorValueRange(color)[0]))
        var endNumber = _chart.legendNumberFormat()(Math.floor(colorValueRange(color)[1]))
        return startNumber + ' to ' + endNumber
    }

    /** 
     #### .legendMargin
     Set or get the margin for the legend. This will position the legend container. Only the bottom and left are actually used.
     The default is set to { bottom: 50, left: 20 }
    */
    _chart.legendMargin = function(_) {
        if(!arguments.length) return _legendMargin;
        _legendMargin = _;
        return _chart;
    }

    /** 
     #### .legendSwatchMargin
     Set or get the margin of the legend swatch. Accepts an object with the properties, top, right, bottom, left.
     The default is set to { bottom: 5, right: 5 }
    */
    _chart.legendSwatchMargin = function (_) {
        if(!arguments.length) return _legendSwatchMargin;
        _legendSwatchMargin = _;
        return _chart;
    }

    /**
     #### .legendSwatchHeight 
     Set or get the height of a legend swatch(the colored rectangle).
     The default is set to 15
     */
    _chart.legendSwatchHeight = function (_) {
        if(!arguments.length) return _legendSwatchHeight;
        _legendSwatchHeight = _;
        return _chart;
    }

    /**
     #### .legendHeight
     Set or get the height of the legend container. Accepts a function or a value. Returns a value.
     The default function calculates the height based on the amount of legend items in the legend.
     */
    _chart.legendHeight = function (_) {
        if(!arguments.length) return _getLegendHeight()
        _getLegendHeight = d3.functor(_)
        return _chart
    }

    /**
     #### .showLegend
     Set or get the boolean to show the legend.
     Defaults to false. Make sure to use a scale that can have its extent inverted like a quantize/quantile/linear scale. Ordinal will not work!
     */
    _chart.showLegend = function(_) {
        if(!arguments.length) return _showLegend;
        _showLegend = _;
        return _chart;
    }

    /**
     #### .legendNumberFormat
     Set or get the number format function for the legend number ranges. Default is set to round the number
     */
    _chart.legendNumberFormat = function(_) {
        if(!arguments.length) return _legendNumberFormat;
        _legendNumberFormat = _;
        return _chart;
    }

    /**
     #### .zeroDataMessage
     Set or get the message that appears when a data value is zero. This will show in the legend. By default it will show as 'No Data'
     */
    _chart.zeroDataMessage = function(_) {
        if(!arguments.length) return _zeroDataMessage;
        _zeroDataMessage = _;
        return _chart;
    }

    /**
     #### .enableZoom(boolean)
     Set or get zoom enable value. Default value is false. Set enableZoom(true) to enable built in zoom features. 
     Includes basic d3.zoom scroll zoom, and click-drag panning, as well as button controls for 
     "+" (zoom in), "-" (zoom out) and "Reset Zoom". 

     By default, the "+/-" controls will render in to "#zoomButton", while the reset button will render in to
     "#resetZoomButton". These value can be over-ridden in the methods below.

    **/
    _chart.enableZoom = function(_){
        if (!arguments.length) return _enableZoom;
        _enableZoom = _;
        return _chart;
    };

    /**
     #### .mouseScrollZoomable(boolean)
     Set or get if chart is zoomable by mouse wheel.
    **/
    _chart.mouseScrollZoomable = function(_) {
        if(!arguments.length) return _mouseScrollZoomable;
        _mouseScrollZoomable = _;
        return _chart;
    };

    /**
     #### .afterZoom([function])
     Set or get the function that will execute after zoom. Your afterZoom function should take two parameters (mapGroupD3Node, scaleNumber)
     These values can be used inside your function to dynamically alter styles of map features as zooming occurs. 

     For example: 
     Fading labels in/out as zoom occurs, scaling line weight with zoom level, etc.

    **/
    _chart.afterZoom = function(_){
        if (!arguments.length) return _afterZoom;
        _afterZoom = _;
        return _chart;
    };


    /**
     #### .panOffsetX(boolean)
     if set to true, offsets zoom t[0]  

    **/
    _chart.panOffsetX = function(_){
        if (!arguments.length) return _panOffsetX;
        _panOffsetX = _;
        return _chart;
    };

    /**
     #### .panOffsetY(boolean)
     if set to true, offsets zoom t[1]  

    **/
    _chart.panOffsetY = function(_){
        if (!arguments.length) return _panOffsetY;
        _panOffsetY = _;
        return _chart;
    };

    function plotData(layerIndex) {
        var data = generateLayeredData();

        if (isDataLayer(layerIndex)) {
            var regionG = renderRegionG(layerIndex);

            renderPaths(regionG, layerIndex, data);

            renderTitle(regionG, layerIndex, data);
        }
    }

    function generateLayeredData() {
        var data = {};
        var groupAll = _chart.data();
        for (var i = 0; i < groupAll.length; ++i) {
            data[_chart.keyAccessor()(groupAll[i])] = _chart.valueAccessor()(groupAll[i]);
        }
        return data;
    }

    function isDataLayer(layerIndex) {
        return geoJson(layerIndex).keyAccessor;
    }

    function renderRegionG(layerIndex) {
        var regionG = _g
            .selectAll(layerSelector(layerIndex))
            .classed('selected', function (d) {
                return isSelected(layerIndex, d);
            })
            .classed('deselected', function (d) {
                return isDeselected(layerIndex, d);
            })
            .attr('class', function (d) {
                var layerNameClass = geoJson(layerIndex).name;
                var regionClass = dc.utils.nameToId(geoJson(layerIndex).keyAccessor(d));
                var baseClasses = layerNameClass + ' ' + regionClass;
                if (isSelected(layerIndex, d)) {
                    baseClasses += ' selected';
                }
                if (isDeselected(layerIndex, d)) {
                    baseClasses += ' deselected';
                }
                return baseClasses;
            });
        return regionG;
    }

    function layerSelector(layerIndex) {
        return 'g.layer' + layerIndex + ' g.' + geoJson(layerIndex).name;
    }

    function isSelected(layerIndex, d) {
        return _chart.hasFilter() && _chart.hasFilter(getKey(layerIndex, d));
    }

    function isDeselected(layerIndex, d) {
        return _chart.hasFilter() && !_chart.hasFilter(getKey(layerIndex, d));
    }

    function getKey(layerIndex, d) {
        return geoJson(layerIndex).keyAccessor(d);
    }

    function geoJson(index) {
        return _geoJsons[index];
    }

    function renderPaths(regionG, layerIndex, data) {
        var paths = regionG
            .select('path')
            .attr('fill', function () {
                var currentFill = d3.select(this).attr('fill');
                if (currentFill) {
                    return currentFill;
                }
                return 'none';
            })
            .on('click', function (d) {
                if(d3.event.defaultPrevented) 
                    return;
                else 
                    return _chart.onClick(d, layerIndex);
            });

        dc.transition(paths, _chart.transitionDuration()).attr('fill', function (d, i) {
            return _chart.getColor(data[geoJson(layerIndex).keyAccessor(d)], i);
        });
    }

    _chart.onClick = function (d, layerIndex) {
        var selectedRegion = geoJson(layerIndex).keyAccessor(d);
        dc.events.trigger(function () {
            _chart.filter(selectedRegion);
            _chart.redrawGroup();
        });
    };

    function renderTitle(regionG, layerIndex, data) {
        if (_chart.renderTitle()) {
            regionG.selectAll('title').text(function (d) {
                var key = getKey(layerIndex, d);
                var value = data[key];
                return _chart.title()({key: key, value: value});
            });
        }
    }

    _chart._doRedraw = function () {
        for (var layerIndex = 0; layerIndex < _geoJsons.length; ++layerIndex) {
            plotData(layerIndex);
            if (_projectionFlag) {
                _g.selectAll('g.' + geoJson(layerIndex).name + ' path').attr('d', _geoPath);
            }
        }
        _projectionFlag = false;
        updateLegendText();
    };

    /**
    #### .overlayGeoJson(json, name, keyAccessor) - **mandatory**
    Use this function to insert a new GeoJson map layer. This function can be invoked multiple times
    if you have multiple GeoJson data layers to render on top of each other. If you overlay multiple
    layers with the same name the new overlay will override the existing one.

    Parameters:
    * json - GeoJson feed
    * name - name of the layer
    * keyAccessor - accessor function used to extract 'key' from the GeoJson data. The key extracted by
    this function should match the keys returned by the crossfilter groups.

    ```js
    // insert a layer for rendering US states
    chart.overlayGeoJson(statesJson.features, 'state', function(d) {
        return d.properties.name;
    });
    ```

    **/
    _chart.overlayGeoJson = function (json, name, keyAccessor) {
        for (var i = 0; i < _geoJsons.length; ++i) {
            if (_geoJsons[i].name === name) {
                _geoJsons[i].data = json;
                _geoJsons[i].keyAccessor = keyAccessor;
                return _chart;
            }
        }
        _geoJsons.push({name: name, data: json, keyAccessor: keyAccessor});
        return _chart;
    };

    /**
    #### .projection(projection)
    Set custom geo projection function. See the available [d3 geo projection
    functions](https://github.com/mbostock/d3/wiki/Geo-Projections).  Default value: albersUsa.

    **/
    _chart.projection = function (projection) {
        _geoPath.projection(projection);
        _projectionFlag = true;
        return _chart;
    };

    /**
    #### .geoJsons()
    Returns all GeoJson layers currently registered with this chart. The returned array is a
    reference to this chart's internal data structure, so any modification to this array will also
    modify this chart's internal registration.

    Returns an array of objects containing fields {name, data, accessor}

    **/
    _chart.geoJsons = function () {
        return _geoJsons;
    };

    /**
    #### .geoPath()
    Returns the [d3.geo.path](https://github.com/mbostock/d3/wiki/Geo-Paths#path) object used to
    render the projection and features.  Can be useful for figuring out the bounding box of the
    feature set and thus a way to calculate scale and translation for the projection.

    **/
    _chart.geoPath = function () {
        return _geoPath;
    };

    /**
    #### .removeGeoJson(name)
    Remove a GeoJson layer from this chart by name

    **/
    _chart.removeGeoJson = function (name) {
        var geoJsons = [];

        for (var i = 0; i < _geoJsons.length; ++i) {
            var layer = _geoJsons[i];
            if (layer.name !== name) {
                geoJsons.push(layer);
            }
        }

        _geoJsons = geoJsons;

        return _chart;
    };

    function setupZoomControls() {

        _chart.select('.'+_zoomButtonClass).html('');
        
        var container = _chart.select('.'+_zoomButtonClass)
            .append('div')
            .classed("dc-zoom-button", true);

        var inButton = container.append('div')
            .classed("in", true)
            .text('+');
        var outButton = container.append('div')
            .classed("out", true)
            .text('-');

        var resetButton = _chart.select('.'+_resetZoomButtonClass).html('');

        resetButton = _chart.select('.'+_resetZoomButtonClass)
            .append('div')
            .classed("dc-zoom-reset", true)
            .text("Reset Zoom")
            .on("click", function(){  
                resetZoom();
                _afterZoom(_g, 1);
            });

        inButton.on("click", function() {
            if(_zoom.scale()*2 > _zoom.scaleExtent()[1]){
            }else{
                parametricZoom(_zoom.scale()*2);
            }
        });
        outButton.on("click", function() {
            if(_zoom.scale()/2 < _zoom.scaleExtent()[0]){
                resetZoom();
            }else{
                parametricZoom(_zoom.scale()/2);
            }
        });
    }

    _chart.on("postRender", function(){
        updateClip();
    });

    function relativeBoundingRect(node) {
        var svgRect = _chart.svg().node().getBoundingClientRect();

        var absRect = node.getBoundingClientRect();

         return {
            width: absRect.width,
            height: absRect.height,
            left: absRect.left - svgRect.left,
            right: absRect.right - svgRect.right,
            top: absRect.top - svgRect.top,
            bottom: absRect.bottom - svgRect.bottom
        };
    }

    function updateClip() {
        var gbox = _g.node().getBoundingClientRect();

        var svgRect = _chart.svg().node().getBoundingClientRect();

        _clip = {
            bottom: (-1) * (svgRect.bottom - gbox.bottom),
            top: (svgRect.top - gbox.top),
            left: (svgRect.left - gbox.left),
            right: (-1) * (svgRect.right - gbox.right)
        };
    }

    function zoomed() {
        var s;
        var t;

        var width = _chart.width(),
            height = _chart.height();

        if(d3.event){
            s = d3.event.scale;
            t = d3.event.translate;
        }else{
            s= _zoom.scale();
            t= _zoom.translate();
        }          
        
        function posOr(n) {
            return n > 0 ? n : 0;
        }

        function limitDimension(value, min, max) {
            if (value > max)
                return max;
            if (value < min)
                return min;
            return value;
        }


        var lClip = posOr(_clip.left);
        var rClip = posOr(_clip.right);

        var xMax = lClip * (s);
        var xMin = (-1) * rClip * s;
        if (_panOffsetX)
            xMin = xMin + width * (1 - s);

        t[0] = limitDimension(t[0], xMin, xMax);

        var tClip = posOr(_clip.top);
        var bClip = posOr(_clip.bottom);

        var yMax = tClip * (s);
        var yMin = (-1) * bClip * s;
        if (_panOffsetY)
            yMin = yMin + height * (1 - s); 

        t[1] = limitDimension(t[1], yMin, yMax);

        _zoom.translate(t);
        _g.attr("transform",
            "translate(" + t + ")" +
            "scale(" + s + ")"
        );

        _afterZoom(_g, s);
 
    }

    function interpolateZoom (translate, scale) {
        var self = this;
        return d3.transition().duration(350).tween("zoom", function () {
            var iTranslate = d3.interpolate(_zoom.translate(), translate),
                iScale = d3.interpolate(_zoom.scale(), scale);
            return function (t) {
                _zoom
                    .scale(iScale(t))
                    .translate(iTranslate(t));
                zoomed();
            };
        });
    }
    function parametricZoom(pScale) {
        var translate = _zoom.translate(),
            translate0 = [],
            l = [],
            view = {x: translate[0], y: translate[1], k: _zoom.scale()},
            extent = _zoom.scaleExtent(),
            center = [_chart.width() / 2, _chart.height() / 2],
            target_zoom = pScale,
            s = pScale,
            ox = _chart.width() / 2 - 50,
            oy = _chart.width() / 2;
        d3.event.preventDefault();
        if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }
        translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
        view.k = target_zoom;
        l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];
        view.x += center[0] - l[0];
        view.y += center[1] - l[1];
        interpolateZoom([view.x, view.y], view.k);
    }

    function resetZoom() {
        _zoom.scale(1);
        _zoom.translate([0,0]);
        _g.transition().duration(500).attr('transform', 'translate(0,0)scale(1)');  
    }

    return _chart.anchor(parent, chartGroup);
};
