/**
 * The ndx.d3.js file contains extensions for nv3d.  The current extension is a multiple line chart,
 * where the line chart can have 1, 2, or 3 yAxes.
 *
 * @author Jeff, Spoorthy
 * @since May 2014
 */
(function () {

  nv.models.multiLineChart = function () {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var line1 = nv.models.line()
      , line2 = nv.models.line()
      , line3 = nv.models.line()
      , xAxis = nv.models.axis()
      , y1Axis = nv.models.axis()
      , y2Axis = nv.models.axis()
      , y3Axis = nv.models.axis()
      , legend = nv.models.legend()
      ;

    var margin = {top: 30, right: 60, bottom: 50, left: 60}
      , width = null
      , height = null
      , getX = function (d) {
        return d.x
      }
      , getY = function (d) {
        return d.y
      }
      , color = nv.utils.defaultColor()
      , showLegend = true
      , tooltips = true
      , tooltip = function (key, x, y, e, graph) {
        return '<h3>' + key + '</h3>' +
          '<p>' + y + ' at ' + x + '</p>';
      }
      , x
      , y1
      , y2
      , y3
      , state = {}
      , defaultState = null
      , noData = "No Data Available."
      , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
      ;

    line1
      .clipEdge(false)
      .padData(true);
    line2
      .clipEdge(false)
      .padData(true);
    xAxis
      .orient('bottom')
      .tickPadding(7)
      .highlightZero(false);
    y1Axis
      .orient('left');
    y2Axis
      .orient('right');
    y3Axis
      .orient('right');

    //============================================================

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var showTooltip = function (e, offsetElement) {
      var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0 ),
        x = xAxis.tickFormat()(line1.x()(e.point, e.pointIndex)),
        yAxis = (e.series.axis == 3) ? y3Axis : (e.series.axis == 2) ? y2Axis : y1Axis,
        y = yAxis.tickFormat()(line1.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

      nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
    };

    //------------------------------------------------------------

    function chart(selection) {
      selection.each(function (data) {
        var container = d3.select(this),
          that = this;

        var availableWidth = (width || parseInt(container.style('width')) || 960)
            - margin.left - margin.right,
          availableHeight = (height || parseInt(container.style('height')) || 400)
            - margin.top - margin.bottom;

        chart.update = function () {
          container.transition().call(chart);
        };

        //set state.disabled
        state.disabled = data.map(function (d) {
          return !!d.disabled
        });

        if (!defaultState) {
          var key;
          defaultState = {};
          for (key in state) {
            if (state[key] instanceof Array)
              defaultState[key] = state[key].slice(0);
            else
              defaultState[key] = state[key];
          }
        }

        //------------------------------------------------------------
        // Display No Data message if there's nothing to show.

        if (!data || !data.length || !data.filter(function (d) {
          return d.values.length
        }).length) {
          var noDataText = container.selectAll('.nv-noData').data([noData]);

          noDataText.enter().append('text')
            .attr('class', 'nvd3 nv-noData')
            .attr('dy', '-.7em')
            .style('text-anchor', 'middle');

          noDataText
            .attr('x', margin.left + availableWidth / 2)
            .attr('y', margin.top + availableHeight / 2)
            .text(function (d) {
              return d
            });

          return chart;
        } else {
          container.selectAll('.nv-noData').remove();
        }

        //------------------------------------------------------------

        //------------------------------------------------------------
        // Setup Scales

        var dataLines1 = data.filter(function (d) {
          return d.axis == 1;
        });
        var dataLines2 = data.filter(function (d) {
          return d.axis == 2;
        });
        var dataLines3 = data.filter(function (d) {
          return d.axis == 3;
        });
        var tripleAxis = dataLines3.length > 0;

        x = dataLines1.filter(function (d) {
          return !d.disabled;
        }).length ? line1.xScale() : line2.xScale();
        y1 = line1.yScale();
        y2 = line2.yScale();
        y3 = line3.yScale();

        //------------------------------------------------------------

        //------------------------------------------------------------
        // Setup containers and skeleton of chart

        var wrap = d3.select(this).selectAll('g.nv-wrap.nv-multiLine').data([data]);
        var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-multiLine').append('g');
        var g = wrap.select('g');

        gEnter.append('g').attr('class', 'nv-x nv-axis');
        gEnter.append('g').attr('class', 'nv-y1 nv-axis');
        gEnter.append('g').attr('class', 'nv-y2 nv-axis');
        gEnter.append('g').attr('class', 'nv-y3 nv-axis');
        gEnter.append('g').attr('class', 'nv-line1Wrap');
        gEnter.append('g').attr('class', 'nv-line2Wrap');
        gEnter.append('g').attr('class', 'nv-line3Wrap');
        gEnter.append('g').attr('class', 'nv-legendWrap');

        //------------------------------------------------------------

        //------------------------------------------------------------
        // Legend

        if (showLegend) {
          legend.width(availableWidth);

          g.select('.nv-legendWrap')
            .datum(data.map(function (series) {
              var axis = series.axis;
              var axisLabel = null;
              if (tripleAxis) {
                axisLabel = (axis > 2) ? ' (right axis)' : (axis > 1) ? ' (middle axis)' : ' (left axis)';
              }
              else {
                axisLabel = (axis > 1) ? ' (right axis)' : ' (left axis)';
              }
              series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
              series.key = series.originalKey + axisLabel;
              return series;
            }))
            .call(legend);

          if (margin.top != legend.height()) {
            margin.top = legend.height();
            availableHeight = (height || parseInt(container.style('height')) || 400)
              - margin.top - margin.bottom;
          }

          g.select('.nv-legendWrap')
            .attr('transform', 'translate(' + ( availableWidth / 10 ) + ',' + (-margin.top) + ')');
        }

        //------------------------------------------------------------

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        //------------------------------------------------------------
        // Main Chart Component(s)

        line1
          .width(availableWidth)
          .height(availableHeight)
          .color(data.map(function (d, i) {
            return d.color || color(d, i);
          }).filter(function (d, i) {
              return !data[i].disabled && (data[i].axis == 1);
            }))

        line2
          .width(availableWidth)
          .height(availableHeight)
          .color(data.map(function (d, i) {
            return d.color || color(d, i);
          }).filter(function (d, i) {
              return !data[i].disabled && (data[i].axis == 2);
            }))

        line3
          .width(availableWidth)
          .height(availableHeight)
          .color(data.map(function (d, i) {
            return d.color || color(d, i);
          }).filter(function (d, i) {
              return !data[i].disabled && (data[i].axis == 3);
            }))

        var line1Wrap = g.select('.nv-line1Wrap')
          .datum(dataLines1 && !dataLines1.disabled ? dataLines1 : [
            {values: []}
          ])

        var line2Wrap = g.select('.nv-line2Wrap')
          .datum(dataLines2 && !dataLines2.disabled ? dataLines2 : [
            {values: []}
          ]);

        var line3Wrap = g.select('.nv-line3Wrap')
          .datum(dataLines3 && !dataLines3.disabled ? dataLines3 : [
            {values: []}
          ]);

        d3.transition(line1Wrap).call(line1);
        d3.transition(line2Wrap).call(line2);
        d3.transition(line3Wrap).call(line3);

        //------------------------------------------------------------

        //------------------------------------------------------------
        // Setup Axes

        xAxis
          .scale(x)
          .ticks(availableWidth / 100)
          .tickSize(-availableHeight, 0);

        g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y1.range()[0] + ')');

        d3.transition(g.select('.nv-x.nv-axis'))
          .call(xAxis);

        y1Axis
          .scale(y1)
          .ticks(availableHeight / 36)
          .tickSize(-availableWidth, 0);

        d3.transition(g.select('.nv-y1.nv-axis'))
          .style('opacity', dataLines1.length ? 1 : 0)
          .call(y1Axis);

        y2Axis
          .scale(y2)
          .ticks(availableHeight / 36)
          .tickSize(dataLines1.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

        g.select('.nv-y2.nv-axis')
          .style('opacity', dataLines2.length ? 1 : 0)
          .attr('transform', 'translate(' + (0 + availableWidth) + ',0)');

        d3.transition(g.select('.nv-y2.nv-axis'))
          .call(y2Axis);

        y3Axis
          .scale(y3)
          .ticks(availableHeight / 36)
          .tickSize(dataLines1.length ? 0 : -availableWidth, 0); // Show the y3 rules only if y1 has none

        g.select('.nv-y3.nv-axis')
          .style('opacity', dataLines3.length ? 1 : 0)
          .attr('transform', 'translate(' + (40 + availableWidth) + ',0)');

        d3.transition(g.select('.nv-y3.nv-axis'))
          .call(y3Axis);

        //------------------------------------------------------------

        //============================================================
        // Event Handling/Dispatching (in chart's scope)
        //------------------------------------------------------------

        legend.dispatch.on('stateChange', function (newState) {
          state = newState;
          dispatch.stateChange(state);
          chart.update();
        });

        dispatch.on('tooltipShow', function (e) {
          if (tooltips) showTooltip(e, that.parentNode);
        });

        // Update chart from a state object passed to event handler
        dispatch.on('changeState', function (e) {
          if (typeof e.disabled !== 'undefined') {
            data.forEach(function (series, i) {
              series.disabled = e.disabled[i];
            });

            state.disabled = e.disabled;
          }

          chart.update();
        });

        //============================================================

      });

      return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    line1.dispatch.on('elementMouseover.tooltip', function (e) {
      e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
      dispatch.tooltipShow(e);
    });

    line1.dispatch.on('elementMouseout.tooltip', function (e) {
      dispatch.tooltipHide(e);
    });

    line2.dispatch.on('elementMouseover.tooltip', function (e) {
      e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
      dispatch.tooltipShow(e);
    });

    line2.dispatch.on('elementMouseout.tooltip', function (e) {
      dispatch.tooltipHide(e);
    });

    line3.dispatch.on('elementMouseover.tooltip', function (e) {
      e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
      dispatch.tooltipShow(e);
    });

    line3.dispatch.on('elementMouseout.tooltip', function (e) {
      dispatch.tooltipHide(e);
    });

    dispatch.on('tooltipHide', function () {
      if (tooltips) nv.tooltip.cleanup();
    });

    //============================================================

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.legend = legend;
    chart.line1 = line1;
    chart.line2 = line2;
    chart.line3 = line3;
    chart.xAxis = xAxis;
    chart.y1Axis = y1Axis;
    chart.y2Axis = y2Axis;
    chart.y3Axis = y3Axis;

    d3.rebind(chart, line1, 'defined', 'size', 'interpolate');
    //TODO: consider rebinding x, y and some other stuff
    //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'xRange', 'yRange', 'forceX', 'forceY', 'interactive', 'clipEdge', 'id');

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart.x = function (_) {
      if (!arguments.length) return getX;
      getX = _;
      line1.x(_);
      line2.x(_);
      line3.x(_);
      return chart;
    };

    chart.y = function (_) {
      if (!arguments.length) return getY;
      getY = _;
      line1.y(_);
      line2.y(_);
      line3.y(_);
      return chart;
    };

    chart.margin = function (_) {
      if (!arguments.length) return margin;
      margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
      margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
      margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
      margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
      return chart;
    };

    chart.width = function (_) {
      if (!arguments.length) return width;
      width = _;
      return chart;
    };

    chart.height = function (_) {
      if (!arguments.length) return height;
      height = _;
      return chart;
    };

    chart.color = function (_) {
      if (!arguments.length) return color;
      color = nv.utils.getColor(_);
      legend.color(color);
      return chart;
    };

    chart.showLegend = function (_) {
      if (!arguments.length) return showLegend;
      showLegend = _;
      return chart;
    };

    chart.tooltips = function (_) {
      if (!arguments.length) return tooltips;
      tooltips = _;
      return chart;
    };

    chart.tooltipContent = function (_) {
      if (!arguments.length) return tooltip;
      tooltip = _;
      return chart;
    };

    chart.state = function (_) {
      if (!arguments.length) return state;
      state = _;
      return chart;
    };

    chart.defaultState = function (_) {
      if (!arguments.length) return defaultState;
      defaultState = _;
      return chart;
    };

    chart.noData = function (_) {
      if (!arguments.length) return noData;
      noData = _;
      return chart;
    };

    //============================================================

    return chart;
  }
})();