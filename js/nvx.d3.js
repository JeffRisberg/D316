/**
 * The ndx.d3.js file contains extensions for nv3d.  The current extension is a multiple line chart,
 * where the line chart can have 1, 2, or 3 yAxes.
 *
 * @author Jeff Risberg, Spoorthy Ananthaiath
 * @since May 2014
 */
(function () {

  nv.models.revisedLine = function () {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var scatter = nv.models.scatter()
      ;

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
      , width = 960
      , height = 500
      , color = nv.utils.defaultColor() // a function that returns a color
      , getX = function (d) {
        return d.x
      } // accessor to get the x value from a data point
      , getY = function (d) {
        return d.y
      } // accessor to get the y value from a data point
      , defined = function (d, i) {
        return !isNaN(getY(d, i)) && getY(d, i) !== null
      } // allows a line to be not continuous when it is not defined
      , clipEdge = false // if true, masks lines within x and y scale
      , x //can be accessed via chart.xScale()
      , y //can be accessed via chart.yScale()
      , interpolate = "linear" // controls the line interpolation
      ;

    scatter
      .size(16) // default size
      .sizeDomain([16, 256]) //set to speed up calculation, needs to be unset if there is a custom size accessor
    ;
    scatter.useVoronoi(false);

    //============================================================

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    //============================================================

    function chart(selection) {
      selection.each(function (data) {
          var availableWidth = width - margin.left - margin.right,
            availableHeight = height - margin.top - margin.bottom,
            container = d3.select(this);

          //------------------------------------------------------------
          // Setup Scales

          x = scatter.xScale();
          y = scatter.yScale();

          //------------------------------------------------------------

          //------------------------------------------------------------
          // Setup containers and skeleton of chart

          var wrap = container.selectAll('g.nv-wrap.nv-line').data([data]);
          var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-line');
          var defsEnter = wrapEnter.append('defs');
          var gEnter = wrapEnter.append('g');
          var g = wrap.select('g')

          gEnter.append('g').attr('class', 'nv-groups');
          gEnter.append('g').attr('class', 'nv-scatterWrap');

          wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          //------------------------------------------------------------

          scatter
            .width(availableWidth)
            .height(availableHeight);

          var scatterWrap = wrap.select('.nv-scatterWrap');

          scatterWrap.transition().call(scatter);

          defsEnter.append('clipPath')
            .attr('id', 'nv-edge-clip-' + scatter.id())
            .append('rect');

          wrap.select('#nv-edge-clip-' + scatter.id() + ' rect')
            .attr('width', availableWidth)
            .attr('height', (availableHeight > 0) ? availableHeight : 0);

          g.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + scatter.id() + ')' : '');
          scatterWrap
            .attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + scatter.id() + ')' : '');

          var groups = wrap.select('.nv-groups').selectAll('.nv-group')
            .data(function (d) {
              return d
            }, function (d) {
              return d.key
            });
          groups.enter().append('g')
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1e-6);

          groups.exit().remove();

          groups
            .attr('class', function (d, i) {
              return 'nv-group nv-series-' + i
            })
            .classed('hover', function (d) {
              return d.hover
            })
            .style('fill', function (d, i) {
              return color(d, i)
            })
            .style('stroke', function (d, i) {
              return color(d, i)
            });
          groups
            .transition()
            .style('stroke-opacity', 1)
            .style('fill-opacity', .5);

          var linePaths = groups.selectAll('path.nv-line')
            .data(function (d) {
              return [d]
            });

          linePaths.enter().append('path')
            .attr('class', 'nv-line')
            .style('stroke-width', function (d) {
              if (d['stroke-width']) return d['stroke-width'];
            })
            .attr('d', function (d) {
              if (d['use-points'] == null && d['use-bars'] == null) {
                return d3.svg.line()
                  .interpolate(interpolate)
                  .defined(defined)
                  .x(function (d, i) {
                    return nv.utils.NaNtoZero(x(getX(d, i)))
                  })
                  .y(function (d, i) {
                    return nv.utils.NaNtoZero(y(getY(d, i)))
                  })
                  .apply(this, [d.values])
              }
            });

          linePaths.enter().append('path')
            .attr('class', 'nv-line')
            .style("stroke-dasharray",
            function (d) {
              return d['stroke-width'] ? (d['stroke-width'], 10) : ("4, 10");
            })
            .style('stroke-width',
            function (d) {
              return d['stroke-width'] ? d['stroke-width'] : 4;
            })
            .attr('d', function (d) {
              if (d['use-points'] != null) {
                return d3.svg.line()
                  .x(function (d, i) {
                    return nv.utils.NaNtoZero(x(getX(d, i)))
                  })
                  .y(function (d, i) {
                    return nv.utils.NaNtoZero(y(getY(d, i)))
                  })
                  .apply(this, [d.values])
              }
            });

          data.forEach(function (d, dataIndex) {
            if (d != null && d['use-bars'] != null && !d.disabled) {
              var rectData = d.values;
              var minY = y.domain()[0];
              var maxY = y.domain()[1];
              var groupWidth = 1.0 * availableWidth / rectData.length
              var barIndex = d['bar-index'] || 0;
              var barCount = d['bar-count'] || 1;
              var barWidth = [0, 0.50, 0.37, 0.28][barCount] * groupWidth;
              var barOffset = 0;

              if (barCount == 2) {
                barOffset = [-1, 1][barIndex] * barWidth / 2;
              }
              else if (barCount == 3) {
                barOffset = [-2, 0, 2][barIndex] * barWidth / 2;
              }

              var rects = groups.selectAll('path.nv-rect')
                .data(rectData)
                .enter();

              rects.append('rect')
                .attr('class', 'nv-rect')
                .style('stroke-width', data[0]['stroke-width'] ? 4 : 1)
                .style('fill', function (d, i) {
                  return color(d, dataIndex)
                })
                .attr('x', function (d, i) {
                  return nv.utils.NaNtoZero(x(getX(d, i)) + barOffset - barWidth / 2);
                })
                .attr('y', function (d, i) {
                  if (getY(d, i) > 0)
                    return nv.utils.NaNtoZero(y(getY(d, i)));
                  else
                    return nv.utils.NaNtoZero(y(Math.min(0, maxY)));
                })
                .attr('height', function (d, i) {
                  if (getY(d, i) > 0)
                    return nv.utils.NaNtoZero(y(Math.max(0, minY)) - y(getY(d, i)))
                  else
                    return nv.utils.NaNtoZero(y(getY(d, i)) - y(Math.min(0, maxY)))
                })
                .attr('width', barWidth)
            }
          });
        }
      );

      return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = scatter.dispatch;
    chart.scatter = scatter;

    d3.rebind(chart, scatter, 'id', 'interactive', 'size', 'xScale', 'yScale', 'zScale', 'xDomain', 'yDomain', 'xRange', 'yRange',
      'sizeDomain', 'forceX', 'forceY', 'forceSize', 'padData');

    chart.options = nv.utils.optionsFunc.bind(chart);

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

    chart.x = function (_) {
      if (!arguments.length) return getX;
      getX = _;
      scatter.x(_);
      return chart;
    };

    chart.y = function (_) {
      if (!arguments.length) return getY;
      getY = _;
      scatter.y(_);
      return chart;
    };

    chart.clipEdge = function (_) {
      if (!arguments.length) return clipEdge;
      clipEdge = _;
      return chart;
    };

    chart.color = function (_) {
      if (!arguments.length) return color;
      color = nv.utils.getColor(_);
      scatter.color(color);
      return chart;
    };

    chart.interpolate = function (_) {
      if (!arguments.length) return interpolate;
      interpolate = _;
      return chart;
    };

    chart.defined = function (_) {
      if (!arguments.length) return defined;
      defined = _;
      return chart;
    };

    //============================================================

    return chart;
  }

  nv.models.multiLineChart = function () {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var line1 = nv.models.revisedLine()
      , line2 = nv.models.revisedLine()
      , line3 = nv.models.revisedLine()
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
      , interpolate = "linear"
      , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState')
      ;

    line1
      .clipEdge(false)
      .padData(true);
    line2
      .clipEdge(false)
      .padData(true);
    line3
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
            .attr('transform', 'translate(' + (-0.10 * availableWidth) + ',' + (-margin.top) + ')');
        }

        //------------------------------------------------------------

        wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        //------------------------------------------------------------
        // Configure Axes and their Scales

        xAxis
          .scale(x)
          .ticks(availableWidth / 100)
          .tickSize(-availableHeight, 0);

        y1Axis
          .scale(y1)
          .ticks(availableHeight / 36)
          .tickSize(-availableWidth, 0);

        y2Axis
          .scale(y2)
          .ticks(availableHeight / 36)
          .tickSize(dataLines1.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

        y3Axis
          .scale(y3)
          .ticks(availableHeight / 36)
          .tickSize(dataLines1.length ? 0 : -availableWidth, 0); // Show the y3 rules only if y1 has none

        //------------------------------------------------------------
        // Draw lines and/or bars

        var barCount = 0;
        data.forEach(function (d) {
          if (!d.disabled && d.axis == 1 && d['use-bars']) {
            d['bar-index'] = barCount;
            barCount++;
          }
          if (!d.disabled && d.axis == 2 && d['use-bars']) {
            d['bar-index'] = barCount;
            barCount++;
          }
          if (!d.disabled && d.axis == 3 && d['use-bars']) {
            d['bar-index'] = barCount;
            barCount++;
          }
        });
        data.forEach(function (d) {
          d['bar-count'] = barCount;
        });

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
        g.selectAll(".nv-line1Wrap .nv-line").remove();

        var line2Wrap = g.select('.nv-line2Wrap')
          .datum(dataLines2 && !dataLines2.disabled ? dataLines2 : [
            {values: []}
          ]);
        g.selectAll(".nv-line2Wrap .nv-line").remove();

        var line3Wrap = g.select('.nv-line3Wrap')
          .datum(dataLines3 && !dataLines3.disabled ? dataLines3 : [
            {values: []}
          ]);
        g.selectAll(".nv-line3Wrap .nv-line").remove();

        d3.transition(line1Wrap).call(line1);
        d3.transition(line2Wrap).call(line2);
        d3.transition(line3Wrap).call(line3);

        //------------------------------------------------------------
        // Draw Axes

        g.select('.nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y1.range()[0] + ')');

        d3.transition(g.select('.nv-x.nv-axis'))
          .call(xAxis);

        d3.transition(g.select('.nv-y1.nv-axis'))
          .style('opacity', dataLines1.length ? 1 : 0)
          .call(y1Axis);

        g.select('.nv-y2.nv-axis')
          .style('opacity', dataLines2.length ? 1 : 0)
          .attr('transform', 'translate(' + (0 + availableWidth) + ',0)');

        d3.transition(g.select('.nv-y2.nv-axis'))
          .call(y2Axis);

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

    chart.interpolate = function (_) {
      if (!arguments.length) return interpolate;
      interpolate = _;
      line1.interpolate(_);
      line2.interpolate(_);
      line3.interpolate(_);
      return chart;
    };

    //============================================================

    return chart;
  }
})
  ();