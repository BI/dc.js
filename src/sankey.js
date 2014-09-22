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
//setup the dimension/column name array needed to translate crossfilter data into the sankey 
//data structure
var dimensionColumnnamePairs = [{'dimension' : someDimension, 'columnName' : 'columnNamefromCSV'},
                                {'dimension' : anotherDimension, 'columnName' : 'anotherColumnName'}];
//which column name from the CSV contains the value for measuring the data
var measure_column = 'value';
// create a sankey chart under #sankey element using the default global chart group
var chart = dc.sankey("#sankey")
                .dimColPairs(dimensionColumnnamePairs)
                .measure_column(measure_column);

//filter manually by passing in the column name, and filter value like this
chart.filter('columnNamefromCSV', 'singlefiltervalue');
```

**/
dc.sankey = function(parent, chartGroup) {
    var _chart = dc.capMixin(dc.baseMixin({}));
    var _sankey, _sankeyDataObject, _dimColPairs = [{}], _measureColumn;
    var _margin = {top: 1, right: 1, bottom: 6, left: 1},
        _width = 960 - _margin.left - _margin.right,
        _height = 500 - _margin.top - _margin.bottom;
    var _formatNumber = d3.format(",.0f"),
        _format = function(d) { return _formatNumber(d); },
        _color = d3.scale.category20();

    //****change _filters to let this chart have multiple filters, one for each dimension
    //requires re-implementing a bunch of filter related functions
    var _filters = {};
    var _filterHandler = function (dimension, filters) {
        dimension.filter(null);

        if (filters.length === 0)
            dimension.filter(null);
        else
            dimension.filterFunction(function (d) {
                for(var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    if (filter.isFiltered && filter.isFiltered(d)) {
                        return true;
                    } else if (filter <= d && filter >= d) {
                        return true;
                    }
                }
                return false;
            });

        return filters;
    };

    //Specify the dimension that goes along with the filter by providing column_name as the key.
    //_filters = {regionDimension : ['West', 'East'], otherDimension : }
    _chart.hasFilter = function (column_name, filterVal) {
        if(!arguments.length) {
            if(Object.keys(_filters).length === 0) {
                return false;
            }
            else //check that the filterArr has any filter values added for any dimensions
            {
                return Object.keys(_filters).some(function(column_name) {
                    var filterArray = _filters[column_name].filterArr;
                    return filterArray.length > 0;
                });
            }
        }

        return (_filters[column_name]) ? 
                    _filters[column_name].filterArr.some(function(f) {return f === filterVal;}) : false;
    };

    function removeFilter(column_name, filter) {
        var dimension = lookupDimension(column_name);
        _filters[column_name].filterArr.forEach(function(f, index) {
            if(f === filter) {
                _filters[column_name].filterArr = _filters[column_name].filterArr.splice(index, 0);
            }
        });
        applyFilters();
        _chart._invokeFilteredListener(dimension);
    }

    function addFilter(column_name, filter) {
        var stringify = JSON.stringify(_filters);
        var dimension = lookupDimension(column_name);
        if(!_filters[column_name]){
            
            _filters[column_name] = {'dimension' : dimension, 'filterArr': []};
            _filters[column_name].filterArr = [];
        }
        
        _filters[column_name].filterArr.push(filter);

        var stringify2 = JSON.stringify(_filters);
        applyFilters();
        _chart._invokeFilteredListener(dimension);
    }

    function resetFilters() {
        _filters = {};
        applyFilters();
        _chart._invokeFilteredListener(null);
    }

    //Important function changes for looping through dimensions
    //and applying the filter handler
    function applyFilters() {
        Object.keys(_filters).forEach(function(column_name) {
            var filterArray = _filters[column_name].filterArr;
            var keyDimension = _filters[column_name].dimension;
            var fs = _filterHandler(keyDimension, filterArray);
            _filters[column_name].filterArr = fs ? fs : filterArray;
        });
    }

    _chart.replaceFilter = function(column_name, filter) {
        _filters[column_name].filterArr = [];
        _charts.filter(column_name, filter);
    };

    /**
    #### .filter(columnName, filterValue)
    Filter the chart by specifying the column name and filter value.
    This differs from the normal chart.filter("value") api that comes with Base mixin.
    Returns the _filters object containing all of the specified dimensions and filters.
    ```js
    //filter on a dimension with a string
    chart.filter("csvColumnforRegion", "West");
    **/
    _chart.filter = function(column_name, filter) {
        if(!arguments.length) return _filters;
        if(_chart.hasFilter(column_name, filter)) {
            removeFilter(column_name, filter);
        }
        else {
            addFilter(column_name, filter);
        }
    };

    _chart.filterAll = function() {
        Object.keys(_filters).forEach(function(column_name) {
            _filters[column_name].filterArr = [];
            var keyDimension = _filters[column_name].dimension;
            applyFilters();
            _chart._invokeFilteredListener(keyDimension);
        });
        
    };

    _chart.filters = function() {
        return _filters;

    };

    _chart._mandatoryAttributes([]);

    _chart.transitionDuration(450); // good default

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
    

    /**
    #### .dimColPairs([{dimension: someDimension, columnName: "column"}]) 
    Pass in an array of objects containing a dimension and corresponding column name
    Make sure the array order matches the order in which the dimensions should appear
    in the Sankey diagram from left to right. 
    **/
    _chart.dimColPairs = function(_) {
        if(!arguments.length) return _dimColPairs;
        _dimColPairs = _;
        return _chart;
    };

    /**
    #### .measureColumn([String]) 
    Set the column name that contains the measure value for the chart. 
    **/
    _chart.measureColumn = function(_) {
        if(!arguments.length) return _measureColumn;
        _measureColumn = _;
        return _chart;
    };

    _chart.initData = function () {
        if(_dimColPairs && _measureColumn) {
            _sankeyDataObject = crossfilterToSankeyData(_dimColPairs, _measureColumn);
        }
        else throw "Must provide dimension column array and measure_column";
        return _chart;
    };

    _chart._doRender = function() {
        _chart.initData();
        _chart.root().classed('dc-sankey', true);
        _chart.root().classed('dc-chart', false);
        _chart.root().html('');

        var svg = d3.select(parent).append("svg")
            .attr("width", _width + _margin.left + _margin.right)
            .attr("height", _height + _margin.top + _margin.bottom)
          .append("g")
            .attr("transform", "translate(" + _margin.left + "," + _margin.top + ")");

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
            .text(function(d) { return d.source.name + " → " + d.target.name + "\n" + _format(d.value); });

        var node = svg.append("g").selectAll(".node")
            .data(_sankeyDataObject.nodes)
        .enter().append("g")
            .attr("class", function(d) {return "node " + dc.utils.nameToId(d.name);})
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
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
            .text(function(d) { return d.name + "\n" + _format(d.value); });

        node.append("text")
            .attr("x", -6)
            .attr("y", function(d) { return d.dy / 2; })
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(function(d) { return d.name; })
          .filter(function(d) { return d.x < _width / 2; })
            .attr("x", 6 + _sankey.nodeWidth())
            .attr("text-anchor", "start");

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
        return _chart.hasFilter(d.column_name, d.name);
    }

    function onClick(d) {
        //if click event is blocked, then the element is being dragged so don't filter
        if(d3.event.defaultPrevented) 
            return;
        else 
            _chart.onClick(d);
        
    }

    _chart.onClick = function (d) {
        var filter = d.name;
        var dimensionTofilter = lookupDimension(d.column_name);
        dc.events.trigger(function () {
            _chart.filter(d.column_name, filter);
            _chart.redrawGroup();
        });
    };

    function lookupDimension(d) {
        var dimension ='';
        _dimColPairs.forEach(function(dimColPair) {
            if(dimColPair.columnName === d) {
                dimension = dimColPair.dimension;
            }
        });
        return dimension;
    }


    _chart._doRedraw = function() {
        return _chart._doRender();
    };

    return _chart.anchor(parent, chartGroup);

    //**Translate the crossfilter dimensions to a sankey data structure
    function crossfilterToSankeyData(dimColPairs, measure_column) {

        //Dimensions provided are the source for creating the Sankey Node/Link 
        //data structure
        var t = {nodes: [], links: []};

        //Create nodes for each row field value 
        dimColPairs.forEach(function(dimColPair) {
            var columnName = dimColPair.columnName;
            var s = dimColPair.dimension.top(Infinity);
            s.forEach(function(row){
                insertNodes(row, columnName);
                
            });
        });

        //Important to do the linking only after all of the nodes have been created
        dimColPairs.forEach(function(dimColPair, index) {
            var columnName = dimColPair.columnName;
            var s = dimColPair.dimension.top(Infinity);

            s.forEach(function(row){
                insertOrUpdateLinks(row, columnName, index);
            });
        });


        function insertNodes(row, columnName) {
            var column = columnName;
            if (!nodesContains(row, column)){
                t.nodes.push({name: row[column], column_name: column});
            }   
        }
        
        function insertOrUpdateLinks(row, columnName, index) {
            var column = columnName;
            if (index < (dimColPairs.length-1)) {
                var nextNodeColumn = dimColPairs[index+1].columnName;
                insertOrUpdateLink({name: row[column], column: column}, {name: row[nextNodeColumn], column: nextNodeColumn}, row[measure_column]);
            }
        }
        
        function insertOrUpdateLink(source, target, value){
            var foundLink = findLink(source,target);
            if(foundLink) {
                foundLink.value = foundLink.value + Number(value);
            }
            else {
                t.links.push(newLink(source, target, value));
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
            return {source: indexForNode(source), target: indexForNode(target), value: Number(value)};
        }
       
        function indexForNode(node){
            var len = t.nodes.length;
            for(var i=0;i<len;i++){
                var currentNode = t.nodes[i];
                if (currentNode.name === node.name && currentNode.column_name === node.column) return i;
            }

            return -1; //hopefully never happens
        }
       
        function nodesContains(row, column){
            return t.nodes.some(function(node){ return node.name === row[column] && node.column_name === column;});
        }
       
        function linksContains(source, target){
       
        }
        
        return t;
    }
};