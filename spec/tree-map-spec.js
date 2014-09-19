describe('dc.treeMap', function () {
	var chart;
	var stateFromDimension, stateLiveDimension, regionDimension, countryDimension;
	var crossfilterdata;
	var dimColPairs, measure_column = "value", testNodeName = "US", rootName = "frodo";

	describe('creation', function() {
		beforeEach(function() {
			crossfilterdata = crossfilter(loadDateFixtureSankey());

			stateFromDimension = crossfilterdata.dimension(function(d){return d.state_from;});
			stateLiveDimension = crossfilterdata.dimension(function(d){return d.state_live;});
			regionDimension = crossfilterdata.dimension(function(d){return d.region;});
			countryDimension = crossfilterdata.dimension(function(d){return d.countrycode;});

			dimColPairs = [{'dimension' : countryDimension, 'columnName' : 'countrycode'},
               {'dimension' : regionDimension, 'columnName' : 'region'},
               {'dimension' : stateFromDimension, 'columnName' : 'state_from'},
               {'dimension' : stateLiveDimension, 'columnName' : 'state_live'}];

            var id = "tree-map";
            var parent = appendChartID(id);

            chart = dc.treeMap("#" + id)
            		.topBarHeight(25)
                    .height(200)
                    .width(600)
                    .dimColPairs(dimColPairs)
                    .label(function(d) {return "hi " + d.name + " " + d.value;})
                    .measure_column(measure_column)
                    .rootName(rootName);

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

		it('should have a grandparent element', function() {
			var grandpaElement = chart.root().select("g.grandparent")[0][0];
			expect(grandpaElement).not.toBe(null);
		});

		it('should have the rootName text in the grandpa element', function() {
			var text = chart.root().select("g.grandparent text").text();
			expect(text).toBe("frodo");
		});

		it('should have a grandparent rectangle the same width and height as specified', function() {
			var rect = chart.root().select("g.grandparent rect");
			expect(rect.attr("width")).toBe('600');
			expect(rect.attr("height")).toBe('25');
		});

		it('should have a main depth element', function() {
			var mainDepthElement = chart.root().select("g.depth")[0][0];
			expect(mainDepthElement).not.toBe(null);
		});

		it('should have two children in the depth element', function() {
			var depthChildren = chart.root().selectAll("g.depth g.children")[0];
			expect(depthChildren.length).toBe(2);
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
				var filterArray = filterObj.filterArr;

				expect(filterObj).toBeDefined();
				expect(dimension).toBeDefined();
				expect(filterArray.indexOf('US')).toBe(0);
			});

			it('should have filtered down the children element', function() {
				var depthChildren = chart.root().selectAll("g.depth g.children")[0];
				expect(depthChildren.length).toBe(1);
			});

			it('should remove all filters using filterAll', function() {
					var filterObj = chart.filters().countrycode;
					expect(filterObj.filterArr.indexOf('US')).toEqual(0); //filter exists
					chart.filterAll();
					chart.render();
					expect(filterObj.filterArr.indexOf('US')).toEqual(-1); //filter was removed
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
				expect(chart.zoomLevel()).toBe(0);
				
				chart.root().selectAll("g.depth g.children")[0].forEach(function(d) {
					var text = d3.select(d).select("text").text();
					var onclickfunc = d3.select(d).on("click");
					
					if(text.indexOf("US") > -1) {

						expect(text.indexOf("341") > -1);
					}
					
				});

			});
		});




	});
});