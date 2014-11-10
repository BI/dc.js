/**
## Sankey

Includes: [Base Mixin](#base-mixin)


#### dc.sankey(parent[, chartGroup])
Create a Sankey chart that shows how crossfilter dimensions flow into other dimensions. 
Multiple dimensions can be used. 

Parameters:

* parent : string | node | selection - any valid
 [d3 single selector](https://github.com/mbostock/d3/wiki/Selections#selecting-elements) specifying
 a dom block element such as a div; or a dom element or d3 selection.

* chartGroup : string (optional) - name of the chart group this chart instance should be placed in.
 Interaction with a chart will only trigger events and redraws within the chart's group.

Returns:
A newly created sankey instance

```js
//setup the dimension/column name array(levels) needed to translate crossfilter data into the sankey 
//data structure
var levels = [{'dimension' : someDimension, 'columnName' : 'columnNamefromCSV'},
                                {'dimension' : anotherDimension, 'columnName' : 'anotherColumnName'}];
//which column name from the CSV contains the value for measuring the data
var measureColumn = 'value';
// create a sankey chart under #sankey element using the default global chart group
var chart = dc.sankey("#sankey")
                .levels(levels)
                .measureColumn(measureColumn);

//filter manually by passing in the column name, and filter value like this
chart.filter('columnNamefromCSV', 'singlefiltervalue');
```

**/
dc.sankey = function(parent, chartGroup) {
    var _chart = dc.hierarchyMixin(dc.baseMixin({}));
    var _sankey, _sankeyDataObject;
    var _margin = {top: 1, right: 1, bottom: 6, left: 1}, //margins needed so sankey edges aren't cut off
        _width = 960 - _margin.left - _margin.right,
        _height = 500 - _margin.top - _margin.bottom,
        _noDataMessage = "No data for the selected filters";

    var _formatNumber = d3.format(",.0f"),
        _format = function(d) { return _formatNumber(d); },
        _color = d3.scale.category20();
    var _linkToolTipFunc = function(d) { return d.source.name + " → " + d.target.name + "\n" + _format(d.value); };
    var _nodeToolTipFunc = function(d) { return d.name + "\n" + _format(d.value); };    
    var _labelFunc = function(d) { return d.name; };

    _chart.label = function(_) {
        if(!arguments.length) return _labelFunc;
        _labelFunc = _;
        return _chart;
    };

    _chart.noDataMessage = function(_) {
        if(!arguments.length) return _noDataMessage;
        _noDataMessage = _;
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
    
    _chart.initData = function () {
        if(_chart.levels() && _chart.measureColumn()) {
            _sankeyDataObject = crossfilterToSankeyData(_chart.levels(), _chart.measureColumn());
            if(_sankeyDataObject === null)
                return null;
        }
        else throw "Must provide dimension column array levels and the measureColumn";
        return _chart;
    };

    function getColumnName(index) {
        return levels[index].columnName;
    }

    _chart._doRender = function() {
        _chart.root().classed('dc-sankey', true);
        _chart.root().classed('dc-chart', false);
        _chart.resetSvg();

        var svg = _chart.svg()
            .attr("width", _width + _margin.left + _margin.right)
            .attr("height", _height + _margin.top + _margin.bottom)
          .append("g")
            .attr("transform", "translate(" + _margin.left + "," + _margin.top + ")");
        var checkForData = _chart.initData();
        if(checkForData === null) {
            _chart.select("g").append("g").append("text")
                .attr("x", _width/2 + _margin.left)
                .attr("y", _height/2 + _margin.top)
                .classed("no-data-sankey", true)
                .text(_noDataMessage);

            return null;
        }
        
        _sankey = d3.sankey()
            .nodeWidth(15)
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
            .style("fill", function(d) { return _color(d.name.replace(/ .*/, "")); })
            .style("stroke", function(d) { return d3.rgb(d.color).darker(2); })
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
            _chart.select(".filter.column_" + l.columnName).html("");
            if(_chart.hasFilter(l.columnName)) {
                _chart.select(".filter.column_" + l.columnName)
                    .append("span")
                    .classed("reset", true)
                    .text(_chart.filters(l.columnName)[0])
                    .on("click", function(e) {
                        _chart.filterAll(l.columnName);
                        _chart.redraw();
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

        //Dimensions provided are the source for creating the Sankey Node/Link 
        //data structure
        var t = {nodes: [], links: []};

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

        //Important to do the linking only after all of the nodes have been created
        levels.forEach(function(level, index) {
            var columnName = level.columnName;
            var s = level.dimension.top(Infinity);

            s.forEach(function(row){
                if(row[measureColumn] > 0)
                    insertOrUpdateLinks(row, columnName, index);
            });
        });


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