/**
## Sankey

Includes: [Base Mixin](#base-mixin) [Hierarchy Mixin](#hierarchy-mixin)


#### dc.sankey(parent[, chartGroup])
Create a Sankey chart that shows how dimensions flow into other dimensions in a hierarchichal fashion.

Parameters:

* parent : string | node | selection - any valid
 [d3 single selector](https://github.com/mbostock/d3/wiki/Selections#selecting-elements) specifying
 a dom block element such as a div; or a dom element or d3 selection.

* chartGroup : string (optional) - name of the chart group this chart instance should be placed in.
 Interaction with a chart will only trigger events and redraws within the chart's group.

Returns:
A newly created sankey instance

```js
//setup the dimension hierarchy we call 'levels'
//the levels data structure specifies dimension, and its corresponding columnName from the csv data
var levels = [{'dimension' : someDimension, 'columnName' : 'columnNamefromCSV'},
                                {'dimension' : anotherDimension, 'columnName' : 'anotherColumnName'}];
//set the column used as your measure
var measureColumn = 'value';

// create a sankey
var chart = dc.sankey("#sankey")
                .width(600)
                .height(400)
                .levels(levels)
                .measureColumn(measureColumn);

//filter manually by passing in the column name, and filter value like this
chart.filter('columnNamefromCSV', 'singlefiltervalue');
```

#### Add Column Labels
Add labels that go on top of each sankey column. These column labels will also show the filter of that column, and can remove that filter by clicking that filter label.
You must use your own styles to position these labels, but the onclick handler that controls the filters will be automatically applied to the label text.
```html
<!-- Add span elements with the classname that corresponds with the column name in the following format: column_YOURCOLUMNNAME If your dimensions were based off of "country", "state", and "region" columns, they would look like the following -->
<div id="sankey">
    <span class="column_country"></span>
    <span class="column_state"></span>
    <span class="column_region"></span>

</div>
```

**/
dc.sankey = function(parent, chartGroup) {
    var _chart = dc.hierarchyMixin(dc.baseMixin({}));
    var _sankey, _sankeyDataObject, _nodeWidth = 15;
    var _margin = {top: 1, right: 1, bottom: 6, left: 1}, //margins needed so sankey edges aren't cut off
        _width = 960 - _margin.left - _margin.right,
        _height = 500 - _margin.top - _margin.bottom,
        _totalNegativeValue, _showNegativeTotal = false,
        _totalNegFormatter = function(d){return d;},
        _noDataMessage = "<span class=\"error\">No data for the selected filters</span>",
        _negativeDataMessage = "<span class=\"error\">All data found was negative values.</span>";

    var _formatNumber = d3.format(",.0f"),
        _format = function(d) { return _formatNumber(d); },
        _colors = d3.scale.category20();
    var _linkToolTipFunc = function(d) { return d.source.name + " → " + d.target.name + "\n" + _format(d.value); };
    var _nodeToolTipFunc = function(d) { return d.name + "\n" + _format(d.value); };    
    var _labelFunc = function(d) { return d.name; };

    /**
    #### .label(function)
    Specify the callback to display text that goes next to nodes(rectangles). 
    **/
    _chart.label = function(_) {
        if(!arguments.length) return _labelFunc;
        _labelFunc = _;
        return _chart;
    };

    /**
    #### .noDataMessage(function)
    Specify the callback to display the message when no data is found.
    **/
    _chart.noDataMessage = function(_) {
        if(!arguments.length) return _noDataMessage;
        _noDataMessage = _;
        return _chart;
    };

    /**
    #### .negativeDataMessage(function)
    Specify the callback to display the message when all the data values in the chart are negative numbers. 
    **/
    _chart.negativeDataMessage = function(_) {
        if(!arguments.length) return _negativeDataMessage;
        _negativeDataMessage = _;
        return _chart;
    };

    /**
    #### .showNegativeTotal(boolean)
    Pass a boolean flag for whether or not to show the negative data number. Defaults to false.
    **/
    _chart.showNegativeTotal = function(_) {
        if(!arguments.length) return _showNegativeTotal;
        _showNegativeTotal = _;
        return _chart;
    };

    /**
    #### .totalNegFormatter(function)
    Pass a function to format the total negative value. 
    **/
    _chart.totalNegFormatter = function(_) {
        if(!arguments.length) return _totalNegFormatter;
        _totalNegFormatter = _;
        return _chart;
    };

    /**
    #### .setColorRange(["#color", "#morecolors"])
    Specify the range of colors that can be used in the ordinal color scale.
    **/
    _chart.colorRange = function(_) {
        if(!arguments.length) return _colors.range();
        _colors.range(_);
        return _chart;
    };

    /**
    #### .nodeToolTip(function)
    Specify the callback to display text in the tooltip when hovering over nodes. 
    **/
    _chart.nodeToolTip = function(_) {
        if(!arguments.length) return _nodeToolTipFunc;
        _nodeToolTipFunc = _;
        return _chart;
    };

    /**
    #### .nodeWidth(Number)
    Specify the width of the sankey nodes. 
    **/
    _chart.nodeWidth = function(_) {
        if(!arguments.length) return _nodeWidth;
        _nodeWidth = _;
        return _chart;
    };

    /**
    #### .linkToolTip(function)
    Specify the callback to display text in the tooltip when hovering over links between nodes. 
    **/
    _chart.linkToolTip = function(_) {
        if(!arguments.length) return _linkToolTipFunc;
        _linkToolTipFunc = _;
        return _chart;
    };

    _chart.transitionDuration(450); //not doing anything at this point

    /**
    #### .width(Number)
    Specify the width of the SVG. Default is 960
    **/
    _chart.width = function(_) {
        if(!arguments.length) return _width;
        _width = _;
        return _chart;
    };

    /**
    #### .height(Number)
    Specify the height of the SVG. Default is 500
    **/
    _chart.height = function(_) {
        if(!arguments.length) return _height;
        _height = _;
        return _chart;
    };

    _chart.data(function(){ 
        return [_sankeyDataObject];
    });
    
    _chart.initData = function () {
        if(_chart.levels() && _chart.measureColumn()) {
            _sankeyDataObject = crossfilterToSankeyData(_chart.levels(), _chart.measureColumn());
            if(_sankeyDataObject === null)
                return null;
            else if(_sankeyDataObject === -1)
                return -1;
        }
        else throw "Must provide dimension column array levels and the measureColumn";
        return _chart;
    };

    function getColumnName(index) {
        return levels[index].columnName;
    }

    _chart._doRender = function() {
        var checkForData = _chart.initData();

        _chart.root().classed('dc-sankey', true);
        _chart.root().classed('dc-chart', false);
        _chart.root().select('.sankey-no-data').html('');
        _chart.root().select('.sankey-negative-data').html('');
        _chart.resetSvg();

        if(checkForData === null) {
            _chart.root().select(".sankey-no-data")
                .html(_noDataMessage);
            _chart.root().select("svg").attr("width", "0").attr("height", "0");

            return checkForData;
        }
        else if(checkForData == -1) {
            _chart.root().select(".sankey-negative-data")
                .html(_negativeDataMessage);
            _chart.root().select("svg").attr("width", "0").attr("height", "0");
            return checkForData;
        }

        _chart.root().select(".sankey-negative-totalValue")
                .html(_totalNegFormatter(_totalNegativeValue));
        var negValueElement = _chart.root().select(".sankey-negative-totalValue-message").remove();
        

        var svg = _chart.svg()
            .attr("width", _width + _margin.left + _margin.right)
            .attr("height", _height + _margin.top + _margin.bottom)
          .append("g")
            .attr("transform", "translate(" + _margin.left + "," + _margin.top + ")");
        
        _showNegativeTotal && _totalNegativeValue < 0 && d3.select(parent).append(function() {return negValueElement.node();});

        _sankey = d3.sankey()
            .nodeWidth(_nodeWidth)
            .nodePadding(10)
            .size([_width, _height]);

        var path = _sankey.link();
        _sankey
            .nodes(_sankeyDataObject.nodes)
            .links(_sankeyDataObject.links)
            .layout(32);

        var link = svg.append("g").selectAll(".link")
                      .data(_sankeyDataObject.links)
                    .enter().append("path")
                      .attr("class", "link")
                      .attr("d", path)
                      .style("stroke-width", function(d) { return Math.max(1, d.dy); })
                      .sort(function(a, b) { return b.dy - a.dy; });

        link.append("title")
            .text(_linkToolTipFunc);

        var node = svg.append("g").selectAll(".node")
            .data(_sankeyDataObject.nodes)
        .enter().append("g")
            .attr("class", function(d) {return "node " + dc.utils.nameToId(d.name);})
            .attr("transform", function(d) { 
                return "translate(" + d.x + "," + d.y + ")"; 
            })
            .on("click", onClick)
        .call(d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", dragstarted)
            .on("drag", dragmove)
            .on("dragend", dragended))
            .classed("deselected", function (d) {
                return (_chart.hasFilter()) ? !isSelectedNode(d) : false;
            })
            .classed("selected", function (d) {
                return (_chart.hasFilter()) ? isSelectedNode(d) : false;
            });
        node.append("rect")
            .attr("height", function(d) { return d.dy; })
            .attr("width", _sankey.nodeWidth())
            .attr("class", function(d) {return "node-" + d.columnName;})
            .attr("fill", function(d) {return _colors(d.name);})
          .append("title")
            .text(_nodeToolTipFunc);

        node.append("text")
            .attr("x", -6)
            .attr("y", function(d) { return d.dy / 2; })
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(_labelFunc)
          .filter(function(d) { return d.x < _width / 2; })
            .attr("x", 6 + _sankey.nodeWidth())
            .attr("text-anchor", "start");

        //add span for filter control
        _chart.levels().forEach(function(l){
            d3.select(".filter.column_" + l.columnName).html("");
            if(_chart.hasFilter(l.columnName)) {
                _chart.select(".filter.column_" + l.columnName)
                    .append("span")
                    .classed("reset", true)
                    .text(_chart.filters(l.columnName)[0])
                    .on("click", function(e) {
                        _chart.filterAll(l.columnName);
                        _chart.redrawGroup();
                    });
            }  
        });
        

        function dragstarted(d) {
            //this makes elements come to top, but interferes with listeners 
            //this.parentNode.appendChild(this); 
        }

        function dragmove(d) {
            d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(_height - d.dy, d3.event.y))) + ")");
            _sankey.relayout();
            link.attr("d", path);
        }

        function dragended(d) {

        }
    };

    function isSelectedNode (d) {
        return _chart.hasFilter(d.columnName, d.name);
    }

    function onClick(d) {
        //if click event is blocked(if a drag event is occuring the defaultPrevented will be true),
        //then the element is being dragged so don't filter
        if(d3.event.defaultPrevented) 
            return;
        else 
            _chart.onClick(d);
        
    }

    _chart.onClick = function (d) {
        var filterValue = d.name;
        dc.events.trigger(function () {
            _chart.filter(d.columnName, filterValue);
            _chart.redrawGroup();            
        });
    };

    _chart._doRedraw = function() {
        return _chart._doRender();
    };

    return _chart.anchor(parent, chartGroup);

    //**Translate the crossfilter dimensions to a sankey data structure
    function crossfilterToSankeyData(levels, measureColumn) {

        _totalNegativeValue = 0;
        //Dimensions provided are the source for creating the Sankey Node/Link 
        //data structure
        var t = {nodes: [], links: []};

        //flag for no data
        var noData = false; 

        //Create nodes for each row field value 
        levels.forEach(function(level) {
            var columnName = level.columnName;
            var s = level.dimension.top(Infinity);
            if(!s.length) {
                noData = true;
                return; 
            }
            s.forEach(function(row){
                if(row[measureColumn] > 0)
                    insertNodes(row, columnName);
                
                
            });
        });

        //if the chart receives no data return a null sankey data object
        if(noData) {
            return null;
        }

        var allNegativeData = true;
        //Important to do the linking only after all of the nodes have been created
        levels.forEach(function(level, index) {
            var columnName = level.columnName;
            var s = level.dimension.top(Infinity);

            s.forEach(function(row){
                if(row[measureColumn] > 0) {
                    allNegativeData = false;
                    insertOrUpdateLinks(row, columnName, index);
                }
                else
                    _totalNegativeValue += Number(row[measureColumn]);
            });
        });

        //if all the nodes are negative values then return -1 
        //we will later display a message to the user instead of showing a blank chart
        if(allNegativeData === true) {
            return -1;
        }

        function insertNodes(row, columnName) {
            var column = columnName;
            if (!nodesContains(row, column)){
                t.nodes.push({name: row[column], columnName: column});
            }   
        }
        
        function insertOrUpdateLinks(row, columnName, index) {
            var column = columnName;
            if (index < (levels.length-1)) {
                var nextNodeColumn = levels[index+1].columnName;
                insertOrUpdateLink({name: row[column], column: column}, {name: row[nextNodeColumn], column: nextNodeColumn}, row[measureColumn]);
            }
        }
        
        function insertOrUpdateLink(source, target, value){
            var foundLink = findLink(source,target);
            var linkValue = Number(value);

            if(foundLink) {
                foundLink.value = foundLink.value + linkValue;
            }
            else {

                t.links.push(newLink(source, target, linkValue));
            }
        }
        
        function findLink(source, target){
            var sourceIndex = indexForNode(source);
            var targetIndex = indexForNode(target);
            var len = t.links.length;
            for(var i=0;i<len;i++){
                var currentLink = t.links[i];
                if(currentLink.source === sourceIndex && currentLink.target === targetIndex){
                    return currentLink;
                }
            }
            return false;
        }
        
        function newLink(source, target, value){
            return {source: indexForNode(source), target: indexForNode(target), value: value};
        }

        function indexForNode(node){
            var len = t.nodes.length;
            for(var i=0;i<len;i++){
                var currentNode = t.nodes[i];
                if (currentNode.name === node.name && currentNode.columnName === node.column) return i;
            }

            return -1; //hopefully never happens
        }

        function nodesContains(row, column){
            return t.nodes.some(function(node){ return node.name === row[column] && node.columnName === column;});
        }

        function linksContains(source, target){
       
        }
        
        return t;
    }
};