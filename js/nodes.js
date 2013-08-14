window.onresize = resize

function resize() {
  var chart = document.getElementById("chart")

  var w = chart.offsetWidth
  var h = chart.offsetHeight

  if (force)
    force.size([w, h]).start()
}


/**
 * Sidebar
 */
var meshinfo = d3.select("#sidebar")
                 .insert("div", ":first-child")

meshinfo.append("h2").text("Suche")

meshinfo.append("input")
  .attr("id", "search")
  .on("keyup", function(){show_node(this.value)})
  .on("change", function(){show_node(this.value)})


meshinfo.append("h2").text("Mesh")

meshinfo.append("p")
        .attr("id", "nodecount")


/**
 * Higlight searched nodes
 */
function show_node(query) {
  if (query.length == 0) {
    vis.selectAll(".node").classed("marked", false)
    return
  }

  vis.selectAll(".node")
    .classed("marked", function(d) {
      return d.id.toLowerCase().indexOf(query.toLowerCase()) >= 0;
    })
}

var hashstr = window.location.hash.substring(1)

function isConnected(a, b) {
  return linkedByIndex[a.index + "," + b.index] ||
         linkedByIndex[b.index + "," + a.index] ||
         a.index == b.index
}

function highlight(b) {
  return function(d) {
    if (dragging) return

    vis.selectAll(".node")
       .classed("faded", function(o) {
         return !(isConnected(d, o)) && b
       })
       .classed("highlight", function(o) {
         return isConnected(d, o) && b
       })

    vis.selectAll(".label")
       .classed("faded", function(o) {
         return !isConnected(d, o) && b
       })
       .classed("highlight", function(o) {
         return o == d && b
       })

    vis.selectAll(".link")
       .classed("faded", function(o) {
         return !(o.source === d || o.target === d) && b
       })
  }
}

function goto_node(d) {
  show_node_info(d)
}

function show_node_info(node) {
  d3.selectAll("#nodeinfo").remove()

  nodeinfo = d3.select("#chart")
               .append("div")
               .attr("id", "nodeinfo")

  nodeinfo.append("button")
          .attr("class", "refresh")
          .text("refresh")
          .on("click", function() {
            goto_node(node)
          })

  nodeinfo.append("button")
          .attr("class", "close")
          .text("x")
          .on("click", function() {
             nodeinfo.remove()
          })

  nodeinfo.append("h1")
          .text(node.id)


  load_node_info(node.id, function(data) {
    var list = nodeinfo.append("dl");

    list.append("dt").text('Lat/Long');
    list.append("dd").text(data.latitude + "/" + data.longitude);

    list.append("dt").text('Hardware');
    list.append("dd").text(data.hardware);

    list.append("dt").text('Links');
    list.append("dd").text(data.links.length);
  });
}

function toggle_button(button) {
  button.classed("active", !button.classed("active"))
}

function update_graph() {
  var button = d3.select(this)
  var value = button.attr("value")
  toggle_button(button)

  visible[value] = button.classed("active")
  update()
}

var vis = d3.select("#chart").append("svg")
            .attr("pointer-events", "all")
            .call(d3.behavior.zoom().on("zoom", redraw))
            .append("g")

vis.append("g").attr("class", "links")

vis.append("g").attr("class", "nodes")

vis.append("g").attr("class", "labels")
               .attr("pointer-events", "none")

var linkedByIndex

var chargeScale = 1,
    distScale = 1,
    strengthScale = 1

var force = d3.layout.force()
              .charge( function (d) {
                if (d.flags.client)
                  return -30 * chargeScale

                return -100 * chargeScale
              })
              .gravity(0.035)
              .friction(0.73)
              .theta(0.8)
              .linkDistance(function (d) {
                switch (d.type) {
                  case "client": return 20 * distScale
                  default: return 70 * distScale
                }
              })
              .linkStrength(function (d) {
                switch (d.type) {
                  case "vpn": return 0.01 * strengthScale
                  case "client": return 1 * strengthScale
                  default: return 0.2 * strengthScale
                }
              })
resize()

function tick_event(e) {
  vis.selectAll(".link").selectAll("line")
      .attr("x1", function(d) { return d.source.x })
      .attr("y1", function(d) { return d.source.y })
      .attr("x2", function(d) { return d.target.x })
      .attr("y2", function(d) { return d.target.y })

  vis.selectAll(".node")
     .attr("cx", function(d) { return d.x })
     .attr("cy", function(d) { return d.y })

  vis.selectAll(".label").attr("transform", function(d) {
    return "translate(" + d.x + "," + d.y + ")";
  })
}

var data

var visible = {clients: true, vpn: false, labels: true}

function reload() {
  load_nodes(data, handler)

  function handler(json) {
    data = json

    d3.select("#nodecount")
      .text(data.nodes.length + " Knoten")

    data = calculate_coordinates(data)

    update()
  }
}

function fixate_geonodes(nodes, x) {
  nodes.filter(function(d) {
    return d.geo !== null
  }).forEach(function(d) {
    d.fixed = x
  })
}

function calculate_coordinates(data) {
  var nodes = data.nodes.filter(function(d) {
    return d.data != undefined
  })

  var lat = nodes.map(function(d) { return d.data.latlng[0] })
  var lon = nodes.map(function(d) { return d.data.latlng[1] })

  var max_lat = Math.min.apply(null, lat)
  var min_lat = Math.max.apply(null, lat)

  var min_lon = Math.min.apply(null, lon)
  var max_lon = Math.max.apply(null, lon)

  var width = force.size()[0]
  var height = force.size()[1]

  var scale_x = width / (max_lon - min_lon)
  var scale_y = height / (max_lat - min_lat)

  nodes.forEach(function(d) {
    if (d.x || d.y)
      return

    d.x = (d.data.latlng[1] - min_lon) * scale_x
    d.y = (d.data.latlng[0] - min_lat) * scale_y
  })

  return data
}

var dragging = false

var node_drag = d3.behavior.drag()
        .on("dragstart", dragstart)
        .on("drag", dragmove)
        .on("dragend", dragend)

var d3_layout_forceDragNode

function dragstart(d) {
  dragging = true
  d3_layout_forceDragNode = d
  d.fixed |= 2
}

function dragmove() {
  d3_layout_forceDragNode.px = d3.event.x
  d3_layout_forceDragNode.py = d3.event.y
  force.resume() // restart annealing
}

function dragend() {
  d3_layout_forceDragNode.fixed &= 1
  d3_layout_forceDragNode = null
  dragging = false
}

function update() {
  var links = data.links
                   .filter(function (d) {
                     //if (!visible.vpn && d.type == "vpn")
                     //  return false

                     //if (!visible.clients && (d.source.flags.client || d.target.flags.client))
                     //  return false

                     //// hides links to clients
                     //if (!visible.vpn && (d.source.flags.vpn || d.target.flags.vpn))
                     //  return false

                     return true
                   })

  var link = vis.select("g.links")
                .selectAll("g.link")
                .data(links, function(d) {
                    return d.id
                })

  var linkEnter = link.enter().append("g")
                      .attr("class", function(d) {
                        return "link " + d.type
                      })
                      .on("mouseover", function(d) {
                        if (dragging) return

                        d.source.fixed |= 2
                        d.target.fixed |= 2
                      })
                      .on("mouseout", function(d) {
                        if (dragging) return

                        d.source.fixed &= 1
                        d.target.fixed &= 1
                      })

  linkEnter.append("line")
           .append("title")

  link.selectAll("line")
      .filter( function (d) {
        return d.type != 'client'
      })
      .style("stroke", function(d) {
        switch (d.type) {
          case "vpn":
            return linkcolor['default'](Math.max.apply(null, d.quality.split(",")))
          default:
            var q;
            try {
              q = Math.max.apply(null, d.quality.split(","))
            } catch(e) {
              q = d.quality
            }
            return linkcolor['wifi'](q)

        }
      })
      .attr("class", function(d) {
        try {
          return d.quality.split(",").length==1?"unidirectional":"bidirectional"
        } catch(e) {
          return "bidirectional"
        }
      })

  link.selectAll("title")
      .text( function (d) {
        var s = d.quality
        if (d.type)
          s += " (" + d.type + ")"

        return s
      })

  link.exit().remove()

  //var nodes = data.nodes.filter(function (d) {
  //                if (!visible.vpn && d.flags.vpn)
  //                  return false

  //                if (!visible.clients && d.flags.client)
  //                  return false

  //                if (!d.flags.online)
  //                  return false

  //                return true
  //              })
  //              .sort(function(a, b) {
  //                return (a.flags.client?1:0) < (b.flags.client?1:0)
  //              })

  var nodes = data.nodes

  var node = vis.select("g.nodes")
                .selectAll(".node")
                .data(nodes,
                  function(d) {
                    return d.id
                  }
                )

  var nodeEnter = node.enter().append("circle")
                .attr("class", "node")
                .on("mouseover", highlight(true))
                .on("mouseout", highlight(false))
                .on("click", goto_node)
                .call(node_drag)
                .attr("r", function(d) {
                    if (d.flags.client)
                      return 4
                    else
                      return 8
                })

  node.attr("class", function(d) {
        var s = ["node"]
        for (var key in d.flags)
          if (d.flags.hasOwnProperty(key) && d.flags[key])
            s.push(key)

        return s.join(" ")
      })

  var label = vis.select("g.labels")
                .selectAll("g.label")
                .data(nodes.filter(function(d) {
                      return !d.flags.client && visible.labels
                    }), function(d) {
                    return d.id
                  }
                )

  var labelEnter = label.enter()
                    .append("g")
                    .attr("id", function (d) {
                      return d.id
                    })
                    .attr("class", "label")


/**
 * Draw circles in nodes to visualize existence some data
 *
 * deativated
 *
  var geodot = labelEnter.filter(function(d) {
      return !("data" in d && "latlng" in d.data);
  });

  geodot.append("circle")
                .attr("class", "dot")
                .attr("r", 3)

  var geodot = labelEnter.filter(function(d) {
      return "data" in d && "latlng" in d.data;
  });

  geodot.selectAll(".dot").remove()
*/


  labelEnter.append("text")
            .attr("class", "name")
            .attr("text-anchor", "middle")
            .attr("y", "21px")
            .attr("x", "0px")

  label.selectAll("text.name")
      .text(function(d) {
        return d.id;
      })

  labelTextWidth = function (e) {
    return e.parentNode.querySelector("text").getBBox().width + 3
  }

  labelEnter.insert("rect", "text")
            .attr("y", "10px")
            .attr("x", function(d) { return labelTextWidth(this) / (-2)})
            .attr("width", function(d) { return labelTextWidth(this)})
            .attr("height", "15px")


  label.exit().remove()

  nodeEnter.append("title")

  node.selectAll("title")
    .text(function(d) { return d.name?d.name:" " })

  label.selectAll(".uplinks").remove()

  node.exit().remove()

  force.nodes(nodes)
       .links(links)
       .alpha(0.1)
       .start()

  if (initial == 1) {
    fixate_geonodes(data.nodes, true)

    force.alpha(0.1)
    while(force.alpha() > 0.05)
      force.tick()

    fixate_geonodes(data.nodes, false)

    force.alpha(0.1)
    while(force.alpha() > 0.05)
      force.tick()

    force.on("tick", tick_event)
    force.start()
  }

  initial = 0

  linkedByIndex = {}

  links.forEach(function(d) {
    linkedByIndex[d.source.index + "," + d.target.index] = 1
  })

  if (hashstr.length != 0)
    show_node(hashstr)
}

var initial = 1

reload()

//var timer = window.setInterval(reload, 30000)

function redraw() {
  vis.attr("transform",
      "translate(" + d3.event.translate + ") "
      + "scale(" + d3.event.scale + ")")
}
