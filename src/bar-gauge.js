/**
## Bar Gauge

Includes: [Base Mixin](#base-mixin)

The Bar Gauge is a way to see data displacement. Typically there is a number
Total and 'filled up' number. The bar will show how close the fill number is to the total. 

#### dc.barGauge(parent[, chartGroup])
Parameters:
* parent : string | node | selection - any valid
 [d3 single selector](https://github.com/mbostock/d3/wiki/Selections#selecting-elements) specifying
 a dom block element such as a div; or a dom element or d3 selection.

* chartGroup : string (optional) - name of the chart group this chart instance should be placed in.
 Interaction with a chart will only trigger events and redraws within the chart's group.

 Returns:
A newly created choropleth chart instance

```js
totalFundingBar = dc.barGauge("#total-funding-gauge")
                                .group(totalFundingGroup)
                                .valueAccessor(function(d){return d;})
                                .totalCapacity(function(){
                                  return totalDollars;
                                })
                                .orientation('horizontal') 
                                .thickness(6);
```
**/
dc.barGauge = function (parent, chartGroup) {

    var _chart = dc.marginMixin(dc.baseMixin({}));
    var _filledValue,
        _oldValue,
        _totalCapacity,
        _orientation = 'horizontal', _usePercentageForLengthCalc = false,
        _gap = 0,
        _height = null, _width = null,
        _xAxis = d3.svg.axis().orient("bottom"), _x, _g,
        _drawScale = false, _markers,
        _markerPadding = {top:5,right:5,bottom:5,left:5},
        _markerFormat = d3.format(".0f"), _tickFormat = d3.format(",.0f"),
        _markerTitle = function(marker) {
            var title = "";
            if(marker.member) {
                title = title + marker.member + ": ";
            }
            return title + _markerFormat(marker.value);
        },
        _defaultMarkerHeight = 40, _defaultMarkerWidth = 20;

    //dimension is not required because this component only has one dimension
    _chart._mandatoryAttributes (['group']);

    _chart.transitionDuration(700); // good default

    //Calculate the scale for the axis. Only for x axis as of now.
    function calculateAxisScale() {
        var extent = [0, _chart.totalCapacity()];
        //_x lets us use d3 to scale the real input value to the output value
        _x = d3.scale.linear().domain(extent)
            .range([0, _chart.effectiveWidth()]);
        _xAxis.scale(_x);
        _xAxis.tickFormat(_tickFormat);
    }

    //draw the axis based on the scale
    function drawAxis() {
        var axisG = _g.select("g.axis");

        calculateAxisScale();

        axisG = _g.append("g").attr("class", "axis")
            .attr("transform", "translate(0, " + _chart.effectiveHeight()+ ")");
        dc.transition(axisG, _chart.transitionDuration())
            .call(_xAxis);
    }

    //draw the tick markers on the scale.
    function drawGridLines() {
        _g.selectAll("g.tick")
            .select("line.grid-line")
            .remove();

        _g.selectAll("g.tick")
            .append("line")
            .attr("class", "grid-line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", function() {
                return -_chart.effectiveHeight();
            });
    }

    _chart.value = function() {
        return _chart.data();
    };

    _chart.data(function(group) {
        var valObj = group.value ? group.value() : group.top(1)[0];
        return _chart.valueAccessor()(valObj);

    });

    /**
        #### .orientation(string)
        Set the orientation of the bar 'horizontal' or 'vertical'. 
    **/
    _chart.orientation = function(_) {
        if(!arguments.length) return _orientation;
        _orientation = _;
        return _chart;
    };


    /**
        #### .usePercentageLength(Boolean)
        Set the calculation for the length, and filled length to use percentages, not exact values. The
        svg will be set so its long side is 100% of the parent container. 
        This can be useful for when we want the length of the bar to fill up its parent element, 
        but do not know the size of the parent element. 
    **/
    _chart.usePercentageLength = function(_) {
        if(!arguments.length) return _usePercentageForLengthCalc;
        _usePercentageForLengthCalc = _;
        return _chart;
    };
    /**
        #### .gap([gap])
        Get or set the vertical gap space between rows on a particular row chart instance. Default gap is 5px;
    **/
    _chart.gap = function (_) {
        if (!arguments.length) return _gap;
        _gap = _;
        return _chart;
    };

    /**
        #### .markerPadding(Object)
    **/
    _chart.markerPadding = function (_) {
        if (!arguments.length) return _markerPadding;
        _markerPadding = _;
        return _chart;
    };

    /**
        #### .markerWidth(Number)
        Explicitly set marker width. The marker dimensions are set based on the marker text offset dimensions.
        Setting this explicitly is useful for when a resize/redraw occurs and the text is momentarily 0x0.
    **/
    _chart.defaultMarkerWidth = function (_) {
        if (!arguments.length) return _defaultMarkerWidth;
        _defaultMarkerWidth = _;
        return _chart;
    };

    /**
        #### .markerHeight(Number)
        Explicitly set marker height. The marker dimensions are set based on the marker text offset dimensions.
        Setting this explicitly is useful for when a resize/redraw occurs and the text is momentarily 0x0.
    **/
    _chart.defaultMarkerHeight = function (_) {
        if (!arguments.length) return _defaultMarkerHeight;
        _defaultMarkerHeight = _;
        return _chart;
    };

    /**
        #### .totalCapacity(number)
        Explicitly set total capacity.
    **/
    _chart.totalCapacity = function(_) {
        if (!arguments.length) return _totalCapacity.call(_chart);
        _totalCapacity = d3.functor(_);
        _chart.expireCache();
        return _chart;
    };

    /**
        #### .filledValue(number)
        Explicitly set filled value. 
        The filled value will be used to get the percentage the bar is filled.
    **/
    _chart.filledValue = function(_) {
        if(!arguments.length) return _filledValue;
        _filledValue = _;
        return _chart;
    };

    /**
        #### .drawScale(boolean)
        Explicitly set whether or not to draw the scale. 
    **/
    _chart.drawScale = function(_) {
        if(!arguments.length) return _drawScale;
        _drawScale = _;
        return _chart;
    };

    /**
        #### .drawScale(markerObjArray)
        Set markers with an array of marker objects. The structure should look similar the following:
        markerObjArray = [{value: someValue, statName: "Median"}, 
            {value: otherValue, statName: ""Mean"},
            {value: maxValue, member: maxName, statName: "Max"}];
        If the member is specified, the tooltip will show "member: value"
    **/
    _chart.setMarkers = function(_) {
        if (!arguments.length) return _markers.call(_chart);
        _markers = d3.functor(_);
        _chart.expireCache();
        return _chart;
    };

    /**
        #### .markerTitle(function)
        Set the function to display what goes in the SVG title/tooltip.
    **/
    _chart.markerTitle = function(_) {
        if (!arguments.length) return _markerTitle; 
        _markerTitle = _;
        return _chart;
    };

    function placeMarkers(markers) {
        if(!arguments.length) {
            _markers().forEach(function(marker) {
                var markerGroup = _g.select("g.marker-labels-top")
                  .append("g")
                    .classed("marker-tick", true)
                    .attr("transform","translate(" + _x(marker.value) + ", 0)");

                markerGroup.data([{markerName: marker.statName, memberValue: marker.value, memberName: marker.member}])
                  .enter();

                markerGroup.append("title")
                    .text(_markerTitle(marker));
                markerGroup.append("text")
                    .text(marker.statName)
                    .attr("style", "text-anchor: middle")
                    .attr("transform", "translate(0," + -_markerPadding.bottom + ")");

                var textWidth = markerGroup.select("text").property("offsetWidth");
                var textHeight = markerGroup.select("text").property("offsetHeight");

                //need default height/width incase parent text elements are hidden in dom resulting in height/width of zero
                var appliedTextWidth = (textWidth > 0) ? textWidth : _defaultMarkerWidth; 
                var appliedTextHeight = (textHeight > 0) ? textHeight : _defaultMarkerHeight;
                markerGroup.insert("rect", "text")
                    .classed("marker-rect", true)
                    .attr("x", -appliedTextWidth/2 - _markerPadding.left)
                    .attr("y", -appliedTextHeight - _markerPadding.top - _markerPadding.bottom)
                    .attr("width", appliedTextWidth + _markerPadding.left + _markerPadding.right)
                    .attr("height", appliedTextHeight + _markerPadding.top + _markerPadding.bottom);

                markerGroup.append("line")
                    .classed("marker-line", true)
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", 0)
                    .attr("y2", 5);
                    
                    // .attr("x", (_markerFormat) ? _markerFormat(_x(marker.value)) : _x(marker.value));
                    
                
            });
            return;
        }

        markers.forEach(function(marker) {
            var markerGroup = _g.select("g.marker-labels-top")
                    .append("g")
                    .classed("marker-tick", true)
                    .attr("transform","translate(" + _x(marker.value) + ", 0)");

            markerGroup.data([{markerName: marker.statName, memberValue: marker.value, memberName: marker.member}])
                .enter();

            markerGroup.append("text")
                .text(marker.statName)
                .attr("style", "text-anchor: middle")
                .attr("transform", "translate(0," + -_markerPadding.bottom + ")");

            var textWidth = markerGroup.select("text").property("offsetWidth");
            var textHeight = markerGroup.select("text").property("offsetHeight");

            markerGroup.insert("rect", "text")
                .classed("marker-rect", true)
                .attr("x", -textWidth/2 - _markerPadding.left)
                .attr("y", -textHeight - _markerPadding.top - _markerPadding.bottom)
                .attr("width", textWidth + _markerPadding.left + _markerPadding.right)
                .attr("height", textHeight + _markerPadding.top + _markerPadding.bottom);

            markerGroup.append("line")
                .classed("marker-line", true)
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 0)
                .attr("y2", 5);
        });

    }

    /**
        #### .markerFormat(Function)
        Pass a formatter function like d3.format() to format marker values. 
    **/
    _chart.markerFormat = function(_) {
        if(!arguments.length) return _markerFormat;
        _markerFormat = _;
        return _chart;
        
    };

    /**
        #### .tickFormat(Function)
        Pass a formatter function like d3.format() to format tick values. 
    **/
    _chart.tickFormat = function(_) {
        if(!arguments.length) return _tickFormat;
        _tickFormat = _;
        return _chart;
    };

    /**
        #### .initializeRectangles(ParentSelector, number, number, string)
        Add the background and foreground rectangles. Set the foreground
        rectangle to the calculated fill percantage.
    **/
    var initializeRectangles = function(orientation) {
        //the percentage value will be how much the bar is actually filled up
        var _percentFilled = (_filledValue/_totalCapacity() * 100 <= 100) ? _filledValue/_totalCapacity() * 100 : 100;
        var _oldpercentFilled = (_oldValue/_totalCapacity() * 100 <= 100) ? _oldValue/_totalCapacity() * 100 : 100;
        var filledX, filledY,
            newFilledX, newFilledY,
            offsetX, offsetY,
            containingX, containingY,
            actualThickness, myRectangle, rect_g;

        if(orientation == 'vertical') {
            //NEED TO FIX
            actualThickness = _chart.width() - _chart.margins().left - _chart.margins().right - 2*_gap;
            filledX = actualThickness;
            filledY = _chart.effectiveHeight() * (_oldpercentFilled/100);
            newFilledX = filledX;
            newFilledY = _chart.effectiveHeight() * (_percentFilled/100);
            containingX = actualThickness;
            containingY = _chart.effectiveHeight();
            offsetX = _gap;
            offsetY = 100 - _percentFilled + "%";
            _chart.root().select('svg')
                .attr("width", _chart.width())
                .attr("height", _chart.height());

            rect_g = _g.append("g").classed("rectangle-container", true);
            rect_g.append('rect')
                .classed("dc-bar-gauge-background", true)
                .attr('width', function(){ return containingX;})
                .attr('height', function(){return containingY;})
                .attr('x', 0)
                .attr('y', 0)
              .append("title")
                .text(_markerFormat(_filledValue));
            rect_g.append('rect')
                .classed("dc-bar-gauge-foreground", true)
                .attr('width', function(){return filledX;})
                .attr('height', function(){return filledY;})
                .attr('x', offsetX)
                .attr('y', offsetY)
              .append("title")
                .text(_markerFormat(_filledValue));
            myRectangle = _chart.selectAll('.dc-bar-gauge-foreground');

            dc.transition(myRectangle, _chart.transitionDuration())
                .attr('width', function(){return newFilledX;})
                .attr('height', function(){return newFilledY;});
            
        }
        else { //horizontal
            actualThickness = _chart.height() - _chart.margins().top - _chart.margins().bottom - 2*_gap;
            filledX = (_usePercentageForLengthCalc) ? _oldpercentFilled + "%" : _chart.effectiveWidth() * (_oldpercentFilled/100);
            filledY = actualThickness;
            newFilledX = (_usePercentageForLengthCalc) ? _percentFilled + "%" : _chart.effectiveWidth() * (_percentFilled/100) ;
            newFilledY = filledY;
            containingX = (_usePercentageForLengthCalc) ? "100%" : _chart.effectiveWidth();
            containingY = actualThickness;
            offsetX = 0;
            offsetY = _gap;
            _chart.root().select('svg')
                .attr("height", _chart.height());
                

            rect_g = _g.append("g").classed("rectangle-container", true);
            rect_g.append('rect')
                .classed("dc-bar-gauge-background", true)
                .attr('width', function(){ return containingX;})
                .attr('height', function(){return containingY;})
                .attr('x', 0)
                .attr('y', offsetY)
              .append("title")
                .text(_markerFormat(_filledValue));
            rect_g.append('rect')
                .classed("dc-bar-gauge-foreground", true)
                .attr('width', function(){return filledX;})
                .attr('height', function(){return filledY;})
                .attr('x', offsetX)
                .attr('y', offsetY)
              .append("title")
                .text(_markerFormat(_filledValue));
            myRectangle = _chart.selectAll('.dc-bar-gauge-foreground');

            dc.transition(myRectangle, _chart.transitionDuration())
                .attr('width', function(){return newFilledX;})
                .attr('height', function(){return newFilledY;});
        }
    };

    _chart._doRender = function () {
        _oldValue = (_filledValue === undefined) ? 0 : _filledValue;
        _filledValue = (_chart.value() >= 0) ? _chart.value() : 0;
        _chart.root().classed('dc-bar-gauge', true);
        _chart.root().classed('dc-chart', false);
        _chart.root().html('');
        _chart.resetSvg();

        //Add data to the svg node
        _chart.svg().data([{totalCapacity: _chart.totalCapacity(), filledValue: _chart.value()}])
          .enter();

        _g = _chart.svg()
            .append('g')
            .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")");

        if(_drawScale === true) {
            drawAxis();
            drawGridLines();
            _g.append("g").classed("marker-labels-top", true);
            placeMarkers();
        }

        initializeRectangles(_orientation);


    };


    _chart._doRedraw = function(){
        return _chart._doRender();
    };

    return _chart.anchor(parent, chartGroup);
};
