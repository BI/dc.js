describe('dc.arcGauge', function () {
	var chart, chartHeightSpecified, data;
	var dimension, group;
	var totalCapacity, maxValue, regionDimension;
	describe('creation', function(){
		beforeEach(function () {
			data = crossfilter(loadDateFixture());
			group = data.groupAll().reduceSum(function(d){return d.value;});
			maxValue = group.value();

			regionDimension = data.dimension(function(d) {
                return d.region;
            });

			var id = "arc-gauge";
			var parent = appendChartID(id);

            var idHeightSpecified= "arc-gauge-height-specified";
            var parentHeightSpecified = appendChartID(idHeightSpecified);

			chart = dc.arcGauge("#" + id)
                                .group(group)
                                .valueAccessor(function(d){return d;})
                                .totalCapacity(maxValue);

            chartHeightSpecified = dc.arcGauge("#" + idHeightSpecified)
                                .height(200)
                                .width(180)
                                .innerRadiusRatio(0.5)
                                .group(group)
                                .valueAccessor(function(d){return d;})
                                .totalCapacity(maxValue);
            dc.renderAll();
		});


		it('should generate an instance of the dc chart', function() {
            expect(dc.instanceOfChart(chart)).toBeTruthy();
        });

        it('should be registered', function() {
            expect(dc.hasChart(chart)).toBeTruthy();
        });

        it('should have paths for background and foreground in a g element', function() {
            expect(d3.select(chart.root().selectAll('g path')[0][0]).attr('class')).toEqual("dc-arc-gauge-background");
            expect(d3.select(chart.root().selectAll('g path')[0][1]).attr('class')).toEqual("dc-arc-gauge-foreground");
        });

        it('should only create two paths in the svg', function() {
            expect(chart.root().selectAll('svg path')[0].length).toEqual(2);
        });
        
        it('should have default values are defined', function() {
            //value, totalCapacity, filledValue, startAngle, endAngle, outerRadius, innerRadius
            expect(chart.value()).toBeDefined();
            expect(chart.totalCapacity()).toBeDefined();
            expect(chart.filledValue()).toBeDefined();
            expect(chart.startAngle()).toBeDefined();
            expect(chart.endAngle()).toBeDefined();
            expect(chart.outerRadius()).toBeDefined();
            expect(chart.innerRadius()).toBeDefined();
        });

        //test cases after filter change
        describe('filter change', function() {
            beforeEach(function() {
                regionDimension.filter('East');
                chart.render();
            });

            it('should have correct calculated value when the filter changes', function() {
                //expect the chart value to mirror the value of the cross filter data
                expect(chart.value()).toEqual(data.groupAll().reduceSum(function(d){return d.value;}).value());

            });

            afterEach(function() {
                //unfilter after each case
                regionDimension.filterAll();
            });
        });

        it('should have correct calculated radii values when only height is specified', function() {
            expect(chartHeightSpecified.innerRadius()).toBe(45); //ratio of .5 * outer radius
            expect(chartHeightSpecified.outerRadius()).toBe(90); //.5 of the smaller between width and height.
        });

        it('should have the correct width and height of the svg', function() {
            expect(chartHeightSpecified.root().select("svg").attr("width")).toBe("180");
            expect(chartHeightSpecified.root().select("svg").attr("height")).toBe("200");
        });

	});

});