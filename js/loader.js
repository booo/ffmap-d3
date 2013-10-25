function load_nodes(data, cb) {
  var url = 'http://api.openwifimap.net/view_nodes_spatial?bbox=13.179473876953125,52.45308034523523,13.647079467773438,52.59241215943279'
  d3.json(url, function(json) {

    var data = json.rows;
    var links = [];
    var lookup = {};
    var nodes = [];

    data.forEach(function(d, i){
        nodes.push({
          id: d.id,
          flags: {
            cleint: false
          }
        });
        lookup[d.id] = nodes[i];
      });

    data.forEach(function(source, i){
      //check if there a links at all
      if(source.value.links) {
        source.value.links.forEach(function(target){
          //check if target exists
          if(lookup[target.id]) {
            links.push({
              'id': source.id + ',' + target.id,
              'source': nodes[i],
              'target': lookup[target.id],
            });
          }
        });
      }
    });

    cb({
      'meta': {"timestamp": "2013-08-08T14:32:30"},
      'nodes': nodes,
      'links' : links
    });
  });
};

function load_node_info(id, cb) {
  url =  'http://api.openwifimap.net/db/'+id;
  d3.json(url, cb);
};
