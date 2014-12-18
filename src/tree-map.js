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
var measureColumn = 'value';
// create a row chart under #sankey element using the default global chart group
var chart = dc.rowChart("#treeMap")
                .levels(dimensionColumnnamePairs)
                .measureColumn(measureColumn);

//filter manually by passing in the column name, and filter value like this
chart.filter('columnNamefromCSV', 'singlefiltervalue');
```

**/
dc.treeMap = function (parent, chartGroup) {
	var _chart = dc.colorMixin(dc.hierarchyMixin(dc.baseMixin({})));
	var _treeMapd3, _treeMapDataObject, _currentRoot, _currentXscale, _currentYscale,
		_rootName = "root",
		_zoomLevel = 0, _colors = d3.scale.category20c(),
        _noDataMessage = "<span class=\"error\">No data for the selected filters</span>",
        _negativeDataMessage = "<span class=\"error\">All data found was negative values.</span>";

	var _margin = {top: 0, right: 0, bottom: 0, left: 0},
		_width = 960, _height = 500 - _margin.top - _margin.bottom,
        _crumbTrailX = 6, _crumbTrailY = 6, _crumbTrailHeight = ".75em",
		_transitioning=false;
    var _labelFuncsArray = [function(d) {return d.name;}];
    var _titleBarFunc = function(d) {return d.parent ? _titleBarFunc(d.parent) + "." + d.name : d.name;};

	var _toolTipFunc = function(d) {return d.name;};

    _chart.transitionDuration(500); // good default

    dc.override(_chart, "filterAll", function() {
    	_chart._filterAll();
    	_zoomLevel = 0;
    	_currentRoot = _treeMapDataObject;

    });

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
    #### .crumbTrailHeight(String)
    Set the font height of the crumb trail text within the top bar.
    Example: .crumbTrailHeight(".75em")
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

    _chart.currentRoot = function(_) {
        if(!arguments.length) return _currentRoot;
        _currentRoot = _;
        return _chart;
    };

    _chart.currentXscale = function(_) {
        if(!arguments.length) return _currentXscale;
        _currentXscale = _;
        return _chart;
    };

    _chart.currentYscale = function(_) {
        if(!arguments.length) return _currentYscale;
        _currentYscale = _;
        return _chart;  
    };

    _chart.colors = function(_) {
    	if(!arguments.length) return _colors;
        _colors = _;
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
	#### .noDataMessage(function)
	Message to display if no data is found.  
    **/
    _chart.noDataMessage = function(_) {
    	if(!arguments.length) return _noDataMessage;
    	_noDataMessage = _;
    	return _chart;
    };

    /**
	#### .negativeDataMessage(function)
	Message to display if all data values were negative.
    **/
    _chart.negativeDataMessage = function(_) {
    	if(!arguments.length) return _negativeDataMessage;
    	_negativeDataMessage = _;
    	return _chart;
    };

    /**
    #### .label(callback)
    Pass in a custom label function. These labels are what appear in the top left of each rectangle.
    **/
    _chart.labelFunctions = function(_) {
		if(!arguments.length) return _labelFuncsArray;
		_labelFuncsArray = _;
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
        if(_chart.levels() && _chart.measureColumn()) {
            _treeMapDataObject = crossfilterToTreeMapData(_chart.levels(), _chart.measureColumn());
            if(_treeMapDataObject === null) {
            	return null;
            }
            if(_treeMapDataObject === -1)
            	return -1;
        }
        else throw "Must provide dimension column array and measureColumn";
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
	        var dimensionTofilter = _chart.lookupDimension(d.columnName);

        	//this will add filter for drill down, and remove filter for going up
            _chart.filter(d.columnName, filter);

            //if going up a level remove filters from lower level
            if(!drillDown) {
                _chart.filterAllForLevel(d._children[0].columnName);
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
    };

    function isSelectedNode(d) {
		return _chart.hasFilter(d.columnName, d.name);
    }

    _chart.zoomLevel = function(d) {
		if(!arguments.length) return _zoomLevel;
        _zoomLevel = _;
        return _chart;
    };

    _chart._doRender = function() {
		var checkForData = _chart.initData();
		
		_chart.root().classed('dc-tree-map', true);
		_chart.root().classed('dc-chart', false);
		_chart.root().select('.treemap-no-data').html('');
        _chart.root().select('.treemap-negative-data').html('');
		_chart.select('svg').remove();
		_chart.root().attr("style", "");

        if(checkForData === null) {
            _chart.root().select(".treemap-no-data")
                .html(_noDataMessage);

            return checkForData;
        }
        else if(checkForData == -1) {
            _chart.root().select(".treemap-negative-data")
                .html(_negativeDataMessage);

            return checkForData;
        }

		_chart.root()
			.style("width", _width + "px")
			.style("height", _height + _margin.top + _margin.bottom +  "px");

		var x = d3.scale.linear()
		.domain([0, _width])
		.range([0, _width]);

		var y = d3.scale.linear()
			.domain([0, _height])
			.range([0, _height]);

		_currentXscale = x;
		_currentYscale = y;

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

		// var checkForZero = (_chart.currentRoot().value <= 0);
  //       if(checkForZero) {
		// 	_treeMapDataObject = {name : _negativeDataMessage, columnName : "root", value: "Negative Data",
		// 	children : [], _children: []};
		// 	_currentRoot = _treeMapDataObject;

		// 	_negativeDataMessage(_chart);
		// 	return checkForZero;
		// }

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
	              	if (!_transitioning){
		              	
	              		if(_zoomLevel > 0){

		              		 _zoomLevel --;
							
							if (d) {
		                        // "un-filter" as we drill-up
								onClick(currentRoot, false); 
							}
		                    transition(d);

		                    //second redraw to protect against the following case:
		                    //1.) user does a redraw while there are filters on the chart
	              			//2.) the redraw cause creation of treemap data with the filtered data
	              			//3.) adding this second redraw lets us create the treemap data again 
	              			//4.) but at the point where the data is all there(unfiltered)  again. 
		                    _chart.redraw();
		                }
	              	}
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
						return (_chart.hasFilter()) ? isSelectedNode(d) : false;
					}
				})
				.on("click",function(d) {
					var that = this;
						if (!_transitioning){
							if(d._children) {
								_zoomLevel ++;
								transition(d); 
								onClick(d, true);
							}
							else {
								
								onClick(d, true);
								if(_chart.hasFilter() && isSelectedNode(d)) {
									//note: could not seem to get 'this' value in test spec
									d3.select(that).classed("selected", true);
									d3.select(that).classed("deselected", false);
								}
								else if(!_chart.hasFilter() || !isSelectedNode(d)) {
									d3.select(that).classed("deselected", true);
									d3.select(that).classed("selected", false);
								}
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
					var isOnlyChild = (_zoomLevel === (_chart.levels().length -1));

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
				.attr("class", function(d) {return "parent color_" + _colors(d.name.replace(/ .*/, ""));})
				.call(rect)
              .append("title")
				.text(_toolTipFunc);

            _labelFuncsArray.forEach(function(func, index){
                depthContainerChildren[0].forEach(function(textElement) {
                    func(d3.select(textElement).append("text").classed("label_" + index + " parent-label", true), {x: _currentXscale, y: _currentYscale});
                });
            });
			
            // transition(currentRoot);

			//Do the zoom animation, and set each parent block 
			//to take up as much space as it can proportionately
			function transition(currentRoot) {
				if (_transitioning || !currentRoot) return;
				_transitioning = true;


				//call display again to transition to the next level
				var depthContainerChildren = display(currentRoot),
					parentTransition = depthContainer.transition().duration(_chart.transitionDuration()),
					childTransition = depthContainerChildren.transition().duration(_chart.transitionDuration());

				// Update the domain only after entering new elements.
				x.domain([currentRoot.x, currentRoot.x + currentRoot.dx]);
				y.domain([currentRoot.y, currentRoot.y + currentRoot.dy]);
				_currentXscale = x;
				_currentYscale = y;

				// Enable anti-aliasing during the transition.
				svg.style("shape-rendering", null);

				// Draw child nodes on top of parent nodes.
				svg.selectAll(".depth").sort(function(a, b) {
					return a.depth - b.depth; 
				});
				
				// Start children opacity at 0, then fade in.
				depthContainerChildren.selectAll("text").style("fill-opacity", 0);

				// Transition to the new view.
				//parent elements are dissappearing(0 opacity), while child elements are appearing(1 opacity)
                _labelFuncsArray.forEach(function(func, index) {
                    func(parentTransition.selectAll("text.label_" + index), {x: _currentXscale, y: _currentYscale}, 0);
                    func(childTransition.selectAll("text.label_" + index), {x: _currentXscale, y: _currentYscale}, 1);
                });

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
			var clipPathMargin = 10;

			nodeRect
				.attr("x", function(d) { 
					return x(d.x); 
				})
				.attr("y", function(d) { return y(d.y); })
				.attr("width", function(d) { 
					return x(d.x + d.dx) - x(d.x);
				})
				.attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });


			//Need to add clip path margin so text doesnt go all the way to the edge. 
			// nodeRect.selectAll("clip-path-parent")
			// 	.attr("x", function(d) { return x(d.x + clipPathMargin); })
			// 	.attr("y", function(d) { return y(d.y + clipPathMargin); })
			// 	.attr("width", function(d) { return x(d.x + d.dx) - x(d.x) - x(clipPathMargin*2); })
			// 	.attr("height", function(d) { return y(d.y + d.dy) - y(d.y) - y(clipPathMargin*2); });

		}
	};

	_chart._doRedraw = function() {
		return _chart._doRender();
	};

	return _chart.anchor(parent, chartGroup);

	//#### .crossfilterToTreeMapData([{dimension : someDim, columnName : "colName"}...], String)
	// Return the tree data object
	//Translate crossfilter multi dimensional tabular data into hierarchical tree data
	function crossfilterToTreeMapData(levelsData, measureColumn) {
		var _tree = {name : _rootName, columnName : "root",
					children : [], _children: []};

		//loop over the rows, and then by column to populate the tree data
		var rows = levelsData[0].dimension.top(Infinity);

		var noData = false, allNegativeData = true;
		if(!rows.length) {
		    _tree = {name : "No Data", columnName : "root", value: "No Data",
			children : []};
			noData = true;
		}
		else {
			rows.forEach(function(row) {
				levelsData.forEach(function(level, columnIndex) {
					var columnName = level.columnName;
					if(row[measureColumn] > 0) {
						allNegativeData = false;
						insertNode(row, columnName, columnIndex);
					}
				});
			});
		}
		

		function insertNode(row, columnName, columnIndex) {
			if(!nodesContains(row, columnName, columnIndex)) {
				pushChild(row, columnName, columnIndex);
			}
			else if(columnIndex === (levelsData.length - 1)) {
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

		//Note: negative values get set to zero.
		function pushChild(row, columnName, columnIndex) {
			var nodeChildren = findNodeChildrenDrill(row, columnName, columnIndex).children;
			var newNode = {};
			newNode.name = row[columnName];
			newNode.columnName = columnName;
			if(columnIndex === (levelsData.length - 1)) {
				var startValue = Number(row[measureColumn]);
				newNode.value = startValue;
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
			existingNode.value = Number(existingNode.value) + Number(row[measureColumn]);
		}

		/**
		//#### .findNodeChildrenDrill(Object, String, Number)
		//Drill down until at the correct child object, this function is used internally
		**/
		function findNodeChildrenDrill(row, columnName, columnIndex) {
			var childNode = _tree; //array of child objects
			for (var i = 0; i < columnIndex; i++) {
				childNode.children.some(function(childObj) {
					var fieldValue = row[levelsData[i].columnName];
					if(childObj.name === fieldValue) {
						childNode = childObj;
					}
				});
			}

			return childNode;
		}

		/**
		//#### .zoomLevelDrill(Number)
		//Drill down to the child node by zoom level, this function is used externally
		**/
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
			var dimension = levelsData[zoomLevel].dimension;
			var columnName = levelsData[zoomLevel].columnName;
			return dimension.top(Infinity)[0][columnName]; //assuming that each level of the tree map only has one value in the filter
		}

		if(noData === true)
			return null;
		if(allNegativeData === true)
			return -1;
		return _tree;
	}

};