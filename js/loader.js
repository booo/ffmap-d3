function load_nodes(data, cb) {
  var graph = new SimpleGraph();
  var url = 'http://api.openwifimap.net/view_nodes_spatial?bbox=13.179473876953125,52.45308034523523,13.647079467773438,52.59241215943279'
  d3.json(url, function(json) {
    var data = json.rows;
    for (var i=0; i < data.length; ++i) {
      var entry = data[i].value;
      if ("links" in entry) {
        for (var j=0; j < entry.links.length; j++) {
          var link = entry.links[j];
          graph.addEdge(entry, link.id, link)
        }
      } else {
        graph.addSingleNode(entry, false);
      }
    }

    cb({
      'meta': {"timestamp": "2013-08-08T14:32:30"},
      'nodes' : graph.getNodes(),
      'links' : graph.getEdges()
    });
  });
};

function load_node_info(id, cb) {
  url =  'http://api.openwifimap.net/db/'+id;
  d3.json(url, cb);
};
