'use strict';
var path = require('path');
var gutil = require('gulp-util');
var through = require('through');
var File = gutil.File;

var extend = function(obj1, obj2){
  for (var i in obj2){
    obj1[i] = obj2[i];
  }
  return obj1;
}

module.exports = function (file, options) {
  if (!file) throw new gutil.PluginError('template', 'Missing file option for template');
  var _this = this;

  var firstFile = null;
  var files = {};

  options = extend({
    wrapper: '_',
    mergeWhitespace: true,
    removeComment: true,
    optimizeAttrs: true
  }, options);


  if (typeof file !== 'string') {
    if (typeof file.path !== 'string') {
      throw new gutil.PluginError('template', 'Missing path in file options for template');
    }
    firstFile = new File(file);
  }

  var wrappers = {
    amd:['define(',');'],
    _:['_.templateEx.add(',');']
  }

  return through(function (file) {
    if (file == null) return;

    if (file.isStream()) {
      this.emit('error', new gutil.PluginError('template', 'Streaming not supported'));
    }

    if (!firstFile) firstFile = file;

    var name = file.path.slice(file.base.length, file.path.length - 1);
    name = /(.*)\.[^\.]+$/.exec(name)[1].replace(/\\/g, '/');


    var src = file.contents.toString();
    if (options.mergeWhitespace){
      src = src.replace(/[\n\r\t]+/g, '')
          .replace(/[\s]+/g, ' ')
          .replace(/<%\s+/g, '<%')
          .replace(/<%=\s+/g, '<%=')
          .replace(/<%-\s+/g, '<%-')
          .replace(/\s+%>/g, '%>')
    }

    if (options.removeComment){
      src = src.replace(/<\!--(.+?)-->/g, '')
    }

    if (options.optimizeAttrs){
      src = src.replace(/<\w+.*?[^%]>/g, function(a){
        return a.replace(/="(.*?[^\\])"/g, function(b, c){
          return (/(\s|<%|%>|%|${|})/).test(b) ? b : ('=' + c)
        }).replace(/\/>$/,'>');
      })
    }

    files[name] = src;

  }, function (cb) {
    if (firstFile) {
      var joinedFile = firstFile;
      var wrapper = wrappers[options.wrapper];
      var content = wrapper[0]+JSON.stringify(files, null, 2)+wrapper[1];

      if (typeof file === 'string') {
        joinedFile = firstFile.clone({contents: false});
        joinedFile.path = path.join(firstFile.base, file);
      }
      joinedFile.contents = new Buffer(content);

      this.emit('data', joinedFile);
    }
    this.emit('end');

  });
};
