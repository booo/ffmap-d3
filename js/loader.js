
function load_nodes(data, cb) {
  // determine bounding box from hash
  var hash = window.location.hash;
  var bbox = null;
  var url = 'http://api.openwifimap.net/view_nodes_spatial';
  if (hash.search(/#bbox=/)!=-1) {
    url += '?bbox=' + hash.replace(/#bbox=/, "");
  }


  var graph = new SimpleGraph();
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
