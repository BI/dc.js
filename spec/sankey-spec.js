describe('dc.sankey', function () {
	var chart;
	var stateFromDimension, stateLiveDimension, regionDimension, countryDimension;
	var crossfilterdata;
	var levels, measureColumn = "value", testNodeName = "us";

	describe('creation', function(){
		beforeEach(function () {
			crossfilterdata = crossfilter(loadDateFixtureSankey());
			
			stateFromDimension = crossfilterdata.dimension(function(d){return d.state_from;});
			stateLiveDimension = crossfilterdata.dimension(function(d){return d.state_live;});
			regionDimension = crossfilterdata.dimension(function(d){return d.region;});
			countryDimension = crossfilterdata.dimension(function(d){return d.countrycode;});

			var levels = [{'dimension' : stateFromDimension, 'columnName' : 'state_from'},
                    {'dimension' : stateLiveDimension, 'columnName' : 'state_live'},
                    {'dimension' : regionDimension, 'columnName' : 'region'},
                    {'dimension' : countryDimension, 'columnName' : 'countrycode'}];

			var id = "sankey";
			var parent = appendChartID(id);

			chart = dc.sankey("#" + id)
						.levels(levels)
						.measureColumn(measureColumn);
            chart.render();
		});

		it('should generate an instance of the dc chart', function() {
            expect(dc.instanceOfChart(chart)).toBeTruthy();
        });

        it('should be registered', function() {
            expect(dc.hasChart(chart)).toBeTruthy();
        });

        it('should have a node for the US', function() {
			var usSelection = chart.root().select("g.node." + testNodeName)[0][0];
			expect(usSelection).not.toBe(null);
        });

        it('should create title text for the US', function() {
			var usSelection = chart.root().select("g.node." + testNodeName)[0][0];
			expect(d3.select(usSelection).text().indexOf(testNodeName.toUpperCase()) > -1).toBeTruthy();
        });

        it('should have a rectangle inside the US node', function() {
			var usSelection = chart.root().select("g.node." + testNodeName + " rect")[0][0];
			expect(usSelection).not.toBe(null);
			expect(usSelection).toBeDefined();
        });

        it('should have a link from California to California', function() {
			chart.filterAll();
			chart.render();

			var linkSelection = chart.root().selectAll("g path.link")[0];
			expect(linkSelection.some(function(d) { 
				return d3.select(d).text().indexOf("California") === 0 && d3.select(d).text().indexOf("California", 1) === 13;
			})).toBe(true);
        });

        describe('filter change on chart', function() {
			beforeEach(function() {
				chart.filter('region', 'Central');
				chart.render();
			});

			it('should have the correct filters applied to the chart', function() {
				var filterObj = chart.filters().region;
				var dimension = filterObj.dimension;
				var filterValues = filterObj.filterValues;

				expect(filterObj).toBeDefined();
				expect(dimension).toBeDefined();
				expect(filterValues.indexOf('Central')).toBe(0);
			});

            it('should highlight selected nodes', function() {
				chart.root().selectAll("g.node").each(function(d) {
					//use Central as our example value. It's value is 99.
					if(d.value === 99) {
						expect(d3.select(this).attr("class").indexOf("selected") > 0).toBeTruthy();
					}
					//May add deselected classes in the future. As of now the chart filters itself
					//so the deselected nodes just disappear completely from the DOM.

				});
            });

            it('should remove all filters using filterAll', function() {
					var filterObj = chart.filters().region;
					expect(filterObj.filterValues.indexOf('Central')).toEqual(0); //filter exists
					chart.filterAll();
					chart.render();
					expect(filterObj.filterValues.indexOf('Central')).toEqual(-1); //filter was removed
				});

			afterEach(function() {
				chart.filterAll();
				chart.render();
			});
        });



		describe('filter through clicking', function() {
			var sankObjNodeCal = {};
			sankObjNodeCal.name = "California";
			sankObjNodeCal.value = 154;
			sankObjNodeCal.column_name = "state_from";
			var sankObjNodeSouth = {};
			sankObjNodeSouth.name = "South";
			sankObjNodeSouth.value = 88;
			sankObjNodeSouth.column_name = "region";

            it('onClick should trigger filtering of according to node from data list', function() {
                chart.onClick(sankObjNodeCal);
                expect(chart.filter().state_from.filterValues[0]).toEqual("California");
            });

            it('onClick should reset filter if clicked twice', function() {
                chart.onClick(sankObjNodeCal);
                chart.onClick(sankObjNodeCal);
                expect(chart.filter().state_from.filterValues.length).toEqual(0);
            });

            it('should trigger filtering of mutliple nodes from data list', function() {
                chart.onClick(sankObjNodeCal);
                chart.onClick(sankObjNodeSouth);
                expect(chart.hasFilter("state_from", "California")).toBeTruthy();
                expect(chart.hasFilter("region", "South")).toBeTruthy();
            });
        });
	});
});