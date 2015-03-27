if (!process.env.NODE_ENV && process.argv.length == 3) {
	var _env = process.argv[2];
	if(process.argv[2].length){
	    process.env.NODE_ENV = _env;
	}
}

var fs      = require('fs');
var config  = require('config');
var analyzer   = require('./lib/analyzer');
// start the monitor
var a = analyzer.createAnalyzer(config.analyzer);

/*
// load plugins
config.plugins.forEach(function(pluginName) {
  var plugin = require(pluginName);
  if (typeof plugin.initMonitor !== 'function') return;
  console.log('loading plugin %s on monitor', pluginName);
  plugin.initMonitor({
    monitor: monitor,
    config:  config
  });
});
*/
a.start();