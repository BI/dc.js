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
	var _treeMapd3, _treeMapDataObject,
		_dimColPairs = [{}], _measureColumn, _rootName = "root",
		_zoomLevel = 0;
	var _margin = {top: 0, right: 0, bottom: 0, left: 0},
		_width = 960,
		_height = 500 - _margin.top - _margin.bottom,
		_formatNumber = d3.format(",d"),
		_transitioning;
    var _filters = {};
    var _labelFunc = function(d) {return d.name;};
    

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
                var removedFilter = _filters[column_name].filterArr.splice(index, 1);
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
    //#### IMPORTANT .filter(column_name, filterValue)
    Filter the chart by specifying the filter and the dimension
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

    _chart.topBarHeight = function(_) {
        if(!arguments.length) return _margin.top;
        _margin.top = _;
        return _chart;
    };

    _chart.width = function(_) {
        if(!arguments.length) return _width;
        _width = _;
        return _chart;
    };

    _chart.height = function(_) {
        if(!arguments.length) return _height;
        _height = _;
        return _chart;
    };

    _chart.dimColPairs = function(_) {
        if(!arguments.length) return _dimColPairs;
        _dimColPairs = _;
        return _chart;
    };

    _chart.measureColumn = function(_) {
        if(!arguments.length) return _measureColumn;
        _measureColumn = _;
        return _chart;
    };

    _chart.rootName = function(_) {
		if(!arguments.length) return _rootName;
        _rootName = _;
        return _chart;
    };

    //#### .label(callback)
    //pass in a custom label function
    _chart.label = function(_) {
		if(!arguments.length) return _labelFunc;
		_labelFunc = _;
        return _chart;
    };

    _chart.initData = function () {
        if(_dimColPairs && _measureColumn) {
            _treeMapDataObject = crossfilterToTreeMapData(_dimColPairs, _measureColumn);
        }
        else throw "Must provide dimension column array and measure_column";
        return _chart;
    };

    function onClick(d) {
        //if click event is blocked, then the element is being dragged so don't filter
        /*if(d3.event.defaultPrevented) 
            return;
        else 
        */
        _chart.onClick(d);
    }

    _chart.onClick = function (d) {
    
        var filter = d.name;
        var dimensionTofilter = lookupDimension(d.column_name);
        dc.events.trigger(function () {
            _chart.filter(d.column_name, filter);

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
		return _chart.hasFilter(d.column_name, d.name);
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

		var grandparent = svg.append("g")
			.attr("class", "grandparent");

		grandparent.append("rect")
			.attr("y", -_margin.top)
			.attr("width", _width)
			.attr("height", _margin.top);

		grandparent.append("text")
			.attr("x", 6)
			.attr("y", 6 - _margin.top)
			.attr("dy", ".75em");

		var fromZoom = false; 
		if(_zoomLevel > 0) fromZoom = true; //flag useful for when filtering at a zoomed level

		initialize(_treeMapDataObject);
		accumulate(_treeMapDataObject);
		layout(_treeMapDataObject);
		display(_treeMapDataObject.zoomLevelDrill(_zoomLevel), fromZoom);

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

		function display(d, fromZoom) {

			//**Must add the grandparent's child(aka parent) 
			//so clicking the grandparent unfilter's the parent
			if(d.parent) {
				d.parent.selectedChild = {};
				d.parent.selectedChild = d;
			}
			
			grandparent
				.datum(d.parent)
              .on("click", function(d) {
					_zoomLevel --;
					transition(d); 
					if (d) {
						onClick(d.selectedChild); 
					}
				})
				.select("text")
				.text(name(d));

			var depthContainer = svg.insert("g", ".grandparent")
				.datum(d)
				.attr("class", "depth");

			var depthContainerChildren = depthContainer.selectAll("g")
				.data(d._children)
              .enter().append("g");

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
						onClick(d);

					}
					else {
						
						onClick(d);
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

			depthContainerChildren.append("rect")
				.attr("class", "parent")
				.call(rect)
              .append("title")
				.text(function(d) { return _formatNumber(d.value); });

			depthContainerChildren.append("text")
				.attr("dy", ".75em")
				.text(_labelFunc)
				.call(text);

			if(fromZoom) transition(d);

			//Do the zoom animation, and set each parent block 
			//to take up as much space as it can proportionately
			function transition(d) {
				if (_transitioning || !d) return;
				_transitioning = true;

				var depthContainerChildren = display(d),
					parentTransition = depthContainer.transition().duration(_chart.transitionDuration()),
					childTransition = depthContainerChildren.transition().duration(_chart.transitionDuration());

				// Update the domain only after entering new elements.
				x.domain([d.x, d.x + d.dx]);
				y.domain([d.y, d.y + d.dy]);

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

		function name(d) {
			return d.parent ? name(d.parent) + "." + d.name
				: d.name;
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
		var _tree = {name : _rootName, column_name : "root",
					children : []};

		//loop over the rows, and then by column to populate the tree data
		var rows = dimColPairs[0].dimension.top(Infinity);

		rows.forEach(function(row) {
			dimColPairs.forEach(function(dimColObj, columnIndex) {
				var columnName = dimColObj.columnName;
				insertNode(row, columnName, columnIndex);
			});
		});

		// console.log("TREE");
		// console.log(JSON.stringify(_tree, undefined, 2));

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
			newNode.column_name = columnName;
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
				childNode._children.some(function(childObj) { 
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