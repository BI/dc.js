/**
## Hierarchy Mixin

The Hierarchy Mixin provides support for hierarchical mutli dimensional filtering.

**/

dc.hierarchyMixin = function(_chart) {
	var _levels = [], _measureColumn, _filters = {};

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
    _chart.hasFilter = function (columnName, filterValue) {
        if(!arguments.length) {
            if(Object.keys(_filters).length === 0) {
                return false;
            }
            else //check that the filterValues has any filter values added for any dimensions
            {
                return Object.keys(_filters).some(function(columnName) {
                    var filterValues = _filters[columnName].filterValues;
                    return filterValues.length > 0;
                });
            }
        }

        return (_filters[columnName]) ? 
                    _filters[columnName].filterValues.some(function(f) {return f === filterValue;}) : false;
    };

    function removeFilter(columnName, filterValue) {
        var dimension = _chart.lookupDimension(columnName);
        _filters[columnName].filterValues.forEach(function(f, index) {
            if(f === filterValue) {
                var removedFilter = _filters[columnName].filterValues.splice(index, 1);
            }
        });
        applyFilters();
        _chart._invokeFilteredListener(dimension);
    }

    function addFilter(columnName, filterValue) {
        var dimension = function() {return _chart.lookupDimension(columnName);};
        if(!_filters[columnName]){
            _filters[columnName] = {'dimension' : dimension, 'filterValues': []};
        }
        
        _filters[columnName].filterValues.push(filterValue);

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
            var filterValues = _filters[columnName].filterValues;
            var keyDimension = _filters[columnName].dimension();
            var fs = _filterHandler(keyDimension, filterValues);
            _filters[columnName].filterValues = fs ? fs : filterValues;
        });
    }

    _chart.replaceFilter = function(columnName, filterValue) {
        _filters[columnName].filterValues = [];
        _charts.filter(columnName, filterValue);
    };

    /**
    #### .filter(columnName, filterValues)
    Filter the chart by specifying the column name and filter values.
    This differs from the normal chart.filter("value") api that comes with Base mixin.
    Returns the _filters object containing all of the specified dimensions and filters.
    ```js
    //filter on a dimension with a string
    chart.filter("csvColumnforRegion", "West");
    **/
    _chart.filter = function(columnName, filterValue) {
        if(!arguments.length) return _filters;
        if(_chart.hasFilter(columnName, filterValue)) {
            removeFilter(columnName, filterValue);
        }
        else {
            addFilter(columnName, filterValue);
        }
    };

    _chart.filterAll = function() {
        Object.keys(_filters).forEach(function(columnName) {
            _filters[columnName].filterValues = [];
            var keyDimension = _filters[columnName].dimension();
            applyFilters();
            _chart._invokeFilteredListener(keyDimension);
        });
        
    };

    _chart.filterAllForLevel = function(columnName) {
        if(_filters[columnName]) {
            _filters[columnName].filterValues = [];
            var keyDimension = _filters[columnName].dimension;
            applyFilters();
            _chart._invokeFilteredListener(keyDimension);
        }
        
    };

    _chart.filters = function() {
        return _filters;

    };

    _chart.lookupDimension = function(d) {
        var dimension ='';
        _levels.forEach(function(level) {
            if(level.columnName === d) {
                dimension = level.dimension;
            }
        });
        return dimension;
    };

    _chart._mandatoryAttributes([]);

    /**
    #### .levels([{dimension: someDimension, columnName: "column"}]) 
    Pass in an array of objects containing a dimension and corresponding column name
    **/
    _chart.levels = function(_) {
        if(!arguments.length) return _levels;
        _levels = _;
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
        //do nothing in hierarchy mixin, should be overridden by sub-function
        //The hierarchical data is not a good fit for crossfilter, so this function
        //should be used to translate tabular crossfilter data into your own hierarchical data structure. 
        return _chart;
    };



	return _chart;
};