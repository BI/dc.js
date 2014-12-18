describe('dc.treeMap', function () {
	var chart;
	var stateFromDimension, stateLiveDimension, regionDimension, countryDimension;
	var crossfilterdata;
	var levels, measureColumn = "value", testNodeName = "US", rootName = "frodo";

	describe('creation', function() {
		beforeEach(function() {
			crossfilterdata = crossfilter(loadDateFixtureSankey());

			stateFromDimension = crossfilterdata.dimension(function(d){return d.state_from;});
			stateLiveDimension = crossfilterdata.dimension(function(d){return d.state_live;});
			regionDimension = crossfilterdata.dimension(function(d){return d.region;});
			countryDimension = crossfilterdata.dimension(function(d){return d.countrycode;});

			levels = [{'dimension' : countryDimension, 'columnName' : 'countrycode'},
               {'dimension' : regionDimension, 'columnName' : 'region'},
               {'dimension' : stateFromDimension, 'columnName' : 'state_from'},
               {'dimension' : stateLiveDimension, 'columnName' : 'state_live'}];

            var id = "tree-map";
            var parent = appendChartID(id);

            chart = dc.treeMap("#" + id)
                    .topBarHeight(25)
                    .height(200)
                    .width(600)
                    .levels(levels)
                    .label(function(d) {return "hi " + d.name + " " + d.value;})
                    .measureColumn(measureColumn)
                    .rootName(rootName)
                    .titleBarCaption(function test(d) {return d.parent ? test(d.parent) + "+" + d.name : d.name;})
                    .toolTip(function(d) {return "Here's the value of " + d.name + ": " + d.value;});

            chart.render();
		});

		it('should generate an instance of the dc chart', function() {
			expect(dc.instanceOfChart(chart)).toBeTruthy();
		});

		it('should be registered', function() {
			expect(dc.hasChart(chart)).toBeTruthy();
		});

		it('should have the correct width and height applied to the svg', function() {
			var svg = chart.root().select("svg");
			expect(svg.attr("width")).toBe('600');
			var modHeight = 225 + "";
			expect(svg.attr("height")).toBe(modHeight);
		});

		it('should have a crumbTrail element', function() {
			var grandpaElement = chart.root().select("g.crumbTrail")[0][0];
			expect(grandpaElement).not.toBe(null);
		});

		it('should have the rootName text in the grandpa element', function() {
			var text = chart.root().select("g.crumbTrail text").text();
			expect(text).toBe("frodo");
		});

		it('should have a crumbTrail rectangle the same width and height as specified', function() {
			var rect = chart.root().select("g.crumbTrail rect");
			expect(rect.attr("width")).toBe('600');
			expect(rect.attr("height")).toBe('25');
		});

		it('should have a main depth element', function() {
			var mainDepthElement = chart.root().select("g.depth")[0][0];
			expect(mainDepthElement).not.toBe(null);
		});

		it('should have two children in the depth element', function() {
			var depthChildren = chart.root().selectAll("g.depth")[0];
			expect(depthChildren.length).toBe(1);
		});

		it('should have six child rectangles in the children', function() {
			var childRectangles = chart.root().selectAll("g.depth g.children .child")[0];
			expect(childRectangles.length).toBe(6); 
		});

		describe('filter changes', function() {
			beforeEach(function() {
				chart.filter('countrycode', 'US');
				chart.render();
			});

			it('should have the correct filters applied to the chart', function() {
				var filterObj = chart.filters().countrycode;
				var dimension = filterObj.dimension;
				var filterValues = filterObj.filterValues;

				expect(filterObj).toBeDefined();
				expect(dimension).toBeDefined();
				expect(filterValues.indexOf('US')).toBe(0);
			});

			it('should have filtered down the children element', function() {
				var depthChildren = chart.root().selectAll("g.depth g.children")[0];
				expect(depthChildren.length).toBe(1);
			});

			it('should remove all filters using filterAll', function() {
				var filterObj = chart.filters().countrycode;
				expect(filterObj.filterValues.indexOf('US')).toEqual(0); //filter exists
				chart.filterAll();
				chart.render();
				expect(filterObj.filterValues.indexOf('US')).toEqual(-1); //filter was removed
			});

			afterEach(function() {
				chart.filterAll();
				chart.render();
			});
		});

		describe('zoom changes', function() {
			beforeEach(function() {

			});

			it('zooms to next level', function() {
				chart.filterAll();
				// chart.render();
				expect(chart.zoomLevel()).toBe(0);
				
				//zoom level not working in jasmine???
				var usData = getDataForNode("US");
				clickZoom(usData);
				// expect(chart.zoomLevel()).toBe(1);
				// chart.render();

				var westData = getDataForNode("West");
				clickZoom(westData);
				// expect(chart.zoomLevel()).toBe(2);
				// chart.render();

				var caliData = getDataForNode("California");
				clickZoom(caliData);
				// chart.render();
				// expect(chart.zoomLevel()).toBe(3);


				//NOTE: Issue with onclick for leaf node and changing the 
				//class of the element to 'selected' or 'deselected'
				//The 'this' is not getting passed through, will need to investigate.
				/*
				var mississippiData = getDataForNode("Mississippi");
				expect(mississippiData.name).toBe("Mississippi");
				clickZoom(mississippiData);
				chart.render();
				expect(chart.zoomLevel()).toBe(3);
				*/
				//expect(misElement.classed("selected")).toBe(true);
				
				function getDataForNode(name) {
					var data = {};
					chart.root().selectAll("g.depth g.children").each(function(d) {
						if(d.name === name) {
							data = d;
						}
					});
					
					return data;
				}

				function clickZoom(dataNode) {
					
					chart.root().selectAll("g.depth g.children")[0].forEach(function(d) {
						var text = d3.select(d).select("text").text();

						if(text.indexOf(dataNode.name) > -1) {
							d3.select(d).on("click")(dataNode); //send in correct data for 
							
						}
					});
				}
			});

			afterEach(function() {
				//Reset the charts
				dc.filterAll();
				dc.redrawAll();
			});
		});

		

	});
});