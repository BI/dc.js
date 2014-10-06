/**
## Tree Map 

Includes: [Base Mixin](#base-mixin)


#### dc.treeMap(parent[, chartGroup])
Create a Tree Map chart that uses multiple crossfilter dimensions in a hierarchical data structure.

Parameters:

* parent : string | node | selection - any valid
 [d3 single selector](https://github.com/mbostock/d3/wiki/Selections#selecting-elements) specifying
 a dom block element such as a div; or a dom element or d3 selection.

* chartGroup : string (optional) - name of the chart group this chart instance should be placed in.
 Interaction with a chart will only trigger events and redraws within the chart's group.

Returns:
A newly created tree map instance

```js
//setup the dimension/column name array in the order of root -> children
//data structure
var dimensionColumnnamePairs = [{'dimension' : someRootDimension, 'columnName' : 'columnNamefromCSV'},
                                {'dimension' : aChildDimension, 'columnName' : 'anotherColumnName'}];
//which column name from the CSV contains the value for measuring the data
var measure_column = 'value';
// create a row chart under #sankey element using the default global chart group
var chart = dc.rowChart("#treeMap")
                .dimColPairs(dimensionColumnnamePairs)
                .measure_column(measure_column);

//filter manually by passing in the column name, and filter value like this
chart.filter('columnNamefromCSV', 'singlefiltervalue');
```

**/
dc.treeMap = function (parent, chartGroup) {
	var _chart = dc.baseMixin({});
	var _treeMapd3, _treeMapDataObject, _currentRoot,
		_dimColPairs = [{}], _measureColumn, _rootName = "root",
		_zoomLevel = 0;
	var _margin = {top: 0, right: 0, bottom: 0, left: 0},
		_width = 960, _height = 500 - _margin.top - _margin.bottom,
        _crumbTrailX = 6, _crumbTrailY = 6, _crumbTrailHeight = ".75em",
		_transitioning;
    var _filters = {};
    var _labelFunc = function(d) {return d.name;};
    var _titleBarFunc = function(d) {return d.parent ? _titleBarFunc(d.parent) + "." + d.name
				: d.name;};
	var _toolTipFunc = function(d) {return d.name;};

    _chart._mandatoryAttributes([]);

    _chart.transitionDuration(700); // good default

    //****change _filters to let this chart have multiple filters, one for each dimension
    //requires re-implementing a bunch of filter related functions
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

    //Specify the dimension that goes along with the filter by providing columnName as the key.
    //_filters = {regionDimension : ['West', 'East'], otherDimension : }
    _chart.hasFilter = function (columnName, filterVal) {
        if(!arguments.length) {
            if(Object.keys(_filters).length === 0) {
                return false;
            }
            else //check that the filterArr has any filter values added for any dimensions
            {
                return Object.keys(_filters).some(function(columnName) {
                    var filterArray = _filters[columnName].filterArr;
                    return filterArray.length > 0;
                });
            }
        }

        return (_filters[columnName]) ? 
                    _filters[columnName].filterArr.some(function(f) {return f === filterVal;}) : false;
    };

    function removeFilter(columnName, filter) {
        var dimension = lookupDimension(columnName);
        _filters[columnName].filterArr.forEach(function(f, index) {

            if(f === filter) {
                var removedFilter = _filters[columnName].filterArr.splice(index, 1);
            }
        });
        applyFilters();
        _chart._invokeFilteredListener(dimension);
    }

    function addFilter(columnName, filter) {
        var stringify = JSON.stringify(_filters);
        var dimension = lookupDimension(columnName);
        if(!_filters[columnName]){
            
            _filters[columnName] = {'dimension' : dimension, 'filterArr': []};
            _filters[columnName].filterArr = [];
        }
        
        _filters[columnName].filterArr.push(filter);

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
        Object.keys(_filters).forEach(function(columnName) {
            var filterArray = _filters[columnName].filterArr;
            var keyDimension = _filters[columnName].dimension;
            var fs = _filterHandler(keyDimension, filterArray);
            _filters[columnName].filterArr = fs ? fs : filterArray;
        });
    }

    _chart.replaceFilter = function(columnName, filter) {
        _filters[columnName].filterArr = [];
        _charts.filter(columnName, filter);
    };

    /**
    //#### IMPORTANT .filter(columnName, filterValue)
    Filter the chart by specifying the filter and the dimension
    ```js
    //filter on a dimension with a string
    chart.filter("csvColumnforRegion", "West");
    **/
    _chart.filter = function(columnName, filter) {
        if(!arguments.length) return _filters;
        if(_chart.hasFilter(columnName, filter)) {
            removeFilter(columnName, filter);
        }
        else {
            addFilter(columnName, filter);
        }
    };

    _chart.filterAll = function() {
        Object.keys(_filters).forEach(function(columnName) {
            _filters[columnName].filterArr = [];
            var keyDimension = _filters[columnName].dimension;
            applyFilters();
            _chart._invokeFilteredListener(keyDimension);
        });
        
    };

    _chart.filterAllSpecific = function(columnName) {
        if(_filters[columnName]) {
            _filters[columnName].filterArr = [];
            var keyDimension = _filters[columnName].dimension;
            applyFilters();
            _chart._invokeFilteredListener(keyDimension);
        }
        
    };

    _chart.filters = function() {
        return _filters;

    };

    /**
    #### .crumbTrailX(Number)
    Set the X position of the crumb trail text within the top bar.
    **/
    _chart.crumbTrailX = function(_) {
        if(!arguments.length) return _crumbTrailX;
        _crumbTrailX = _;
        return _chart;
    };

    /**
    #### .crumbTrailY(Number)
    Set the Y position of the crumb trail text within the top bar.
    **/
    _chart.crumbTrailY = function(_) {
        if(!arguments.length) return _crumbTrailY;
        _crumbTrailY = _;
        return _chart;
    };

    /**
    #### .crumbTrailSize(String)
    Set the font height of the crumb trail text within the top bar.
    Example: .crumbTrailSize(".75em")
    **/
    _chart.crumbTrailHeight = function(_) {
        if(!arguments.length) return _crumbTrailHeight;
        _crumbTrailHeight = _;
        return _chart;
    };

    /**
	#### .topBarHeight(Number)
	Set the height of the bar at the top of the treemap.
    **/
    _chart.topBarHeight = function(_) {
        if(!arguments.length) return _margin.top;
        _margin.top = _;
        return _chart;
    };

    /**
	#### .width(Number)
	Set the width explicitly as it will be used for calculating the node rectangle sizes. 
    **/
    _chart.width = function(_) {
        if(!arguments.length) return _width;
        _width = _;
        return _chart;
    };

	/**
	#### .height(Number)
	Set the height explicitly as it will be used for calculating the node rectangle sizes. 
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
    in the Treemap diagram from top to bottom. 
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

    _chart.currentRoot = function(_) {
        if(!arguments.length) return _currentRoot;
        _currentRoot = _;
        return _chart;
        
    };

    /**
	#### .rootName(String)
	The root name is the displayed as the root parent text in the bar at the top of the treemap.
    **/
    _chart.rootName = function(_) {
		if(!arguments.length) return _rootName;
        _rootName = _;
        return _chart;
    };

    /**
    #### .label(callback)
    Pass in a custom label function. These labels are what appear in the top left of each rectangle.
    **/
    _chart.label = function(_) {
		if(!arguments.length) return _labelFunc;
		_labelFunc = _;
        return _chart;
    };

    /**
	#### .toolTip(callback)
	Pass in a custom tool tip function. These tool tips show text for the rectangles on hover.
    **/
    _chart.toolTip = function(_) {
    	if(!arguments.length) return _toolTipFunc;
		_toolTipFunc = _;
        return _chart;
    };

    /**
	#### .titleBarCaption(callback)
	Pass in custom title bar caption function. The title bar text is show in the bar at the top.
    **/
    _chart.titleBarCaption = function(_) {
    	if(!arguments.length) return _titleBarFunc;
		_titleBarFunc = _;
        return _chart;
    };

    _chart.initData = function () {
        if(_dimColPairs && _measureColumn) {
            _treeMapDataObject = crossfilterToTreeMapData(_dimColPairs, _measureColumn);
        }
        else throw "Must provide dimension column array and measure_column";
        return _chart;
    };

    function onClick(d, drillDown) {
        //if click event is blocked, then the element is being dragged so don't filter
        /*if(d3.event.defaultPrevented) 
            return;
        else 
        */
        _chart.onClick(d, drillDown);
    }

    _chart.onClick = function (d, drillDown) {
    
        var filter = d.name;
        var dimensionTofilter = lookupDimension(d.columnName);

        dc.events.trigger(function () {
            //this will add filter for drill down, and remove filter for going up
            _chart.filter(d.columnName, filter);

            //if going up a level remove filters from lower level
            if(!drillDown) {
                _chart.filterAllSpecific(d._children[0].columnName);
            }

            //Manually redraw all other charts so the tree map can have the hierarchical behavior
            //with the multi dimensions
            var charts = dc.chartRegistry.list(_chart.chartGroup());
            for (var i = 0; i < charts.length; ++i) {
				if(charts[i] !== _chart) {
					charts[i].redraw();
				}
			}
			if(dc._renderlet !== null)
				dc._renderlet(group);

        });

        
    };

    function isSelectedNode(d) {
		return _chart.hasFilter(d.columnName, d.name);
    }

    _chart.zoomLevel = function(d) {
		if(!arguments.length) return _zoomLevel;
        _zoomLevel = _;
        return _chart;
    };

    function lookupDimension(d) {
		var dimension = '';
		_dimColPairs.forEach(function(dimColPair) {
            if(dimColPair.columnName === d) {
                dimension = dimColPair.dimension;
            }
        });
        return dimension;
    }

    _chart._doRender = function() {
		_chart.initData();
		_chart.root().classed('dc-tree-map', true);
		_chart.root().classed('dc-chart', false);
		_chart.root().html('');

		_chart.root()
			.style("width", _width + "px")
			.style("height", _height + _margin.top + _margin.bottom +  "px");

		var x = d3.scale.linear()
		.domain([0, _width])
		.range([0, _width]);

		var y = d3.scale.linear()
			.domain([0, _height])
			.range([0, _height]);

		_treeMapd3 = d3.layout.treemap()
			.children(function(d, depth) { return depth ? null : d._children; })
			.sort(function(a, b) { return a.value - b.value; })
			.ratio(_height / _width * 0.5 * (1 + Math.sqrt(5)))
			.round(false);

		var svg = d3.select(parent).append("svg")
			.attr("width", _width + _margin.left + _margin.right)
			.attr("height", _height + _margin.bottom + _margin.top)
			.style("margin-left", -_margin.left + "px")
			.style("margin.right", -_margin.right + "px")
          .append("g")
			.attr("transform", "translate(" + _margin.left + "," + _margin.top + ")")
			.style("shape-rendering", "crispEdges");

		var crumbTrail = svg.append("g")
			.attr("class", "crumbTrail");

		crumbTrail.append("rect")
			.attr("y", -_margin.top)
			.attr("width", _width)
			.attr("height", _margin.top);

		crumbTrail.append("text")
			.attr("x", _crumbTrailX)
			.attr("y", _crumbTrailY - _margin.top)
			.attr("dy", _crumbTrailHeight);
        _currentRoot = _treeMapDataObject.zoomLevelDrill(_zoomLevel);
		initialize(_treeMapDataObject);
		accumulate(_treeMapDataObject);
		layout(_treeMapDataObject);
		display(_currentRoot);

		function initialize(root) {
			root.x = root.y = 0;
			root.dx = _width;
			root.dy = _height;
			root.depth = 0;
		}

		// Aggregate the values for internal nodes. This is normally done by the
		// treemap layout, but not here because of our custom implementation.
		// We also take a snapshot of the original children (_children) to avoid
		// the children being overwritten when when layout is computed.
		function accumulate(d) {
			return (d._children = d.children) ?
			d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
			: d.value;
		}

		// Compute the treemap layout recursively such that each group of siblings
		// uses the same size (1×1) rather than the dimensions of the parent cell.
		// This optimizes the layout for the current zoom state. Note that a wrapper
		// object is created for the parent node for each group of siblings so that
		// the parent’s dimensions are not discarded as we recurse. Since each group
		// of sibling was laid out in 1×1, we must rescale to fit using absolute
		// coordinates. This lets us use a viewport to zoom.
		function layout(d) {
			if (d._children) {
				_treeMapd3.nodes({_children: d._children});

				d._children.forEach(function(c) {
					c.x = d.x + c.x * d.dx;
					c.y = d.y + c.y * d.dy;
					c.dx *= d.dx;
					c.dy *= d.dy;
					c.parent = d;
					layout(c);
				});
			}
		}

		function display(currentRoot) {
			_currentRoot = currentRoot;

			crumbTrail
				.datum(currentRoot.parent)
              .on("click", function(d) {
					_zoomLevel --;
					
					if (d) {
                        // "un-filter" as we drill-up
						onClick(currentRoot, false); 
					}
                    transition(d); 

                    //second redraw to incase any redraw happens before the filter messes up the 
                    //treemapobject data
                    _chart.redraw();
				})
				.select("text")
				.text(_titleBarFunc(currentRoot));

			var depthContainer = svg.insert("g", ".crumbTrail")
				.datum(currentRoot)
				.attr("class", "depth");

			//container for each main parent box
			//this box will then contain children outlines
			//need clip path to hide excess text on smaller boxes
			var depthContainerChildren = depthContainer.selectAll("g")
				.data(currentRoot._children)
              .enter().append("g")
              	.attr("clip-path", function(d) {return "url(#" + dc.utils.nameToId(d.name) + "-clip-path)";});

			depthContainerChildren.filter(function(d) { return d._children || d; })
				.classed("children", true)
				.classed("deselected", function(d) {
					if(!d._children) {
						return (_chart.hasFilter()) ? !isSelectedNode(d) : false;
					}
				})
				.classed("selected", function(d) {
					if(!d._children) {
						return (_chart.hasFilter()) ? isSelectedNode(d) : true;
					}
				})
				.on("click",function(d) {
					if(d._children) {
						_zoomLevel ++;
						transition(d); 
						onClick(d, true);
					}
					else {
						
						onClick(d, true);
						if(_chart.hasFilter() && isSelectedNode(d)) {
							//note: could not seem to get 'this' value in test spec
							d3.select(this).classed("selected", true);
							d3.select(this).classed("deselected", false);
						}
						else if(!_chart.hasFilter() || !isSelectedNode(d)) {
							d3.select(this).classed("deselected", true);
							d3.select(this).classed("selected", false);
						}
					}
				});

			depthContainerChildren.selectAll(".child")
				.data(function(d) { return d._children || [d]; })
              .enter().append("rect")
				.attr("class", "child")
				.classed("deselected", function(d) {
					if(!d._children) {
						return (_chart.hasFilter()) ? !isSelectedNode(d) : false;
					}
					else return false;
				})
				.classed("selected", function(d) {
					var isOnlyChild = (_zoomLevel === (_dimColPairs.length -1));
					if(!d._children && !isOnlyChild) {
						return (_chart.hasFilter()) ? isSelectedNode(d) : false;
					}
					else return false; 
				})
				.call(rect);

			depthContainerChildren.append("defs").append("clipPath")
				.attr("id", function(d) {return dc.utils.nameToId(d.name) + "-clip-path";})
				.append("rect")
				.attr("class", "clip-path-parent")
				.call(rect);

			depthContainerChildren.append("rect")
				.attr("class", "parent")
				.call(rect)
              .append("title")
				.text(_toolTipFunc);

			depthContainerChildren.append("text")
				.attr("dy", ".75em")
				.text(_labelFunc)
				.call(text);

			transition(currentRoot);

			//Do the zoom animation, and set each parent block 
			//to take up as much space as it can proportionately
			function transition(currentRoot) {
				if (_transitioning || !currentRoot) return;
				_transitioning = true;

				var depthContainerChildren = display(currentRoot),
					parentTransition = depthContainer.transition().duration(_chart.transitionDuration()),
					childTransition = depthContainerChildren.transition().duration(_chart.transitionDuration());

				// Update the domain only after entering new elements.
				x.domain([currentRoot.x, currentRoot.x + currentRoot.dx]);
				y.domain([currentRoot.y, currentRoot.y + currentRoot.dy]);

				// Enable anti-aliasing during the transition.
				svg.style("shape-rendering", null);

				// Draw child nodes on top of parent nodes.
				svg.selectAll(".depth").sort(function(a, b) {
					return a.depth - b.depth; 
				});
				
				// Fade-in entering text.
				depthContainerChildren.selectAll("text").style("fill-opacity", 0);

				// Transition to the new view.
				parentTransition.selectAll("text").call(text).style("fill-opacity", 0);
				childTransition.selectAll("text").call(text).style("fill-opacity", 1);
				parentTransition.selectAll("rect").call(rect);
				childTransition.selectAll("rect").call(rect);

				// Remove the old node when the transition is finished.
				parentTransition.remove().each("end", function() {
					svg.style("shape-rendering", "crispEdges");
					_transitioning = false;
				});
			}

			return depthContainerChildren;
		}

		function text(textLabel) {
			textLabel.attr("x", function(d) { return x(d.x) + 6; })
				.attr("y", function(d) { return y(d.y) + 6; });
		}

		function rect(nodeRect) {
			nodeRect.attr("x", function(d) { return x(d.x); })
				.attr("y", function(d) { return y(d.y); })
				.attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
				.attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
		}
	};

	_chart._doRedraw = function() {
		return _chart._doRender();
	};

	return _chart.anchor(parent, chartGroup);

	//#### .crossfilterToTreeMapData([{dimension : someDim, columnName : "colName"}...], String)
	// Return the tree data object
	//Translate crossfilter multi dimensional tabular data into hierarchical tree data
	function crossfilterToTreeMapData(dimColPairs, measure_column) {
		var _tree = {name : _rootName, columnName : "root",
					children : []};

		//loop over the rows, and then by column to populate the tree data
		var rows = dimColPairs[0].dimension.top(Infinity);

		rows.forEach(function(row) {
			dimColPairs.forEach(function(dimColObj, columnIndex) {
				var columnName = dimColObj.columnName;
				insertNode(row, columnName, columnIndex);
			});
		});

		function insertNode(row, columnName, columnIndex) {
			if(!nodesContains(row, columnName, columnIndex)) {
				pushChild(row, columnName, columnIndex);
			}
			else if(columnIndex === (dimColPairs.length - 1)) {
				//node already existed and this is a leaf so it has a value
				addLeafValue(row, columnName, columnIndex);
			}
		}

		function nodesContains(row, columnName, columnIndex) {
			//traverse through index level of children to get the children we want
			var nodeChildren = findNodeChildrenDrill(row, columnName, columnIndex).children;

			return nodeChildren.some(function(childObj) {
				return childObj.name === row[columnName];
			});
		}

		function pushChild(row, columnName, columnIndex) {
			var nodeChildren = findNodeChildrenDrill(row, columnName, columnIndex).children;
			var newNode = {};
			newNode.name = row[columnName];
			newNode.columnName = columnName;
			if(columnIndex === (dimColPairs.length - 1)) {
				newNode.value = Number(row[measure_column]);
			}
			else newNode.children = [];
			nodeChildren.push(newNode);
		}

		function addLeafValue(row, columnName, columnIndex) {
			var nodeChildren = findNodeChildrenDrill(row, columnName, columnIndex).children;
			var existingNode; 
			nodeChildren.forEach(function(childObj) {
				if(childObj.name === row[columnName]) {
					existingNode = childObj;
				}
			});
			existingNode.value = Number(existingNode.value) + Number(row[measure_column]);
		}

		//#### .findNodeChildrenDrill(Object, String, Number)
		//Drill down until at the correct child object, this function is used internally
		function findNodeChildrenDrill(row, columnName, columnIndex) {
			var childNode = _tree; //array of child objects
			for (var i = 0; i < columnIndex; i++) {
				childNode.children.some(function(childObj) {
					var fieldValue = row[dimColPairs[i].columnName];
					if(childObj.name === fieldValue) {
						childNode = childObj;
					}
				});
			}

			return childNode;
		}

		//#### .zoomLevelDrill(Number)
		//Drill down to the child node by zoom level, this function is used externally
		_tree.zoomLevelDrill = function(zoomLevel) {
			var childNode = _tree;

			for(var i = 0; i < (zoomLevel); i++) {
				//children accessor changed to '_children' because 'children' gets overwritten 
				//by the treemap layout when reinitializing from the zoomed state
				childNode.children.some(function(childObj) { 
					var value = getFilterValue(i);
					if(childObj.name === value) {
						childNode = childObj;
					}
				});	
			}

			return childNode;
		};

		function getFilterValue(zoomLevel) {
			var dimension = dimColPairs[zoomLevel].dimension;
			var columnName = dimColPairs[zoomLevel].columnName;
			return dimension.top(Infinity)[0][columnName]; //assuming that each level of the tree map only has one value in the filter
		}

		return _tree;
	}

};