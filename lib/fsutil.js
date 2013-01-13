var _ = require('underscore')
var async = require('async');
var fs = require('fs');
var util = require('util');
var path = require('path');

exports.mkdirSync = function(dir) {
  try {
    fs.statSync(dir);
  } catch (error) {
    fs.mkdirSync(dir);
  }
};

exports.copySync = function(src, dst) {
  var inArgs = Array.prototype.slice.call(arguments, 2, 3);
  inArgs.unshift(src);
  var fileContents = fs.readFileSync.apply(this, inArgs);

  fs.writeFileSync(dst, fileContents);
};

exports.copyDirSync = function(src, dst) {
  exports.mkdirSync(dst);

  var files = fs.readdirSync(src);

  var i, file, fileStats, srcPath, dstPath;
  for (i in files) {
    file = files[i];
    srcPath = path.join(src, file);
    dstPath = path.join(dst, file);
    fileStats = fs.lstatSync(srcPath);

    if (fileStats.isDirectory()) {
      exports.copyDirSync(srcPath, dstPath);
    } else {
      exports.copySync(srcPath, dstPath);
    }
  }
};

exports.copy = function copy(src, dst, options, cb) {
  if (cb === undefined) {
    cb = options;
    options = {};
  }

  function copy(err) {
    var is, os;

    if (!err) {
      return cb(new Error("File " + dst + " exists."));
    }

    fs.stat(src, function (err) {
      if (err) {
        return cb(err);
      }
      is = fs.createReadStream(src);
      os = fs.createWriteStream(dst);
      util.pump(is, os, cb);
    });
  }

  fs.stat(dst, copy);
};

exports.move = function move(src, dst, options, cb) {
  if (cb === undefined) {
    cb = options;
    options = {};
  }

  function copyIfFailed(err) {
    if (!err) {
      return cb(null);
    }
    copy(src, dst, function(err) {
      if (!err) {
        // TODO 
        // should we revert the copy if the unlink fails?
        fs.unlink(src, cb);
      } else {
        cb(err);
      }
    });
  }

  fs.stat(dst, function (err) {
    if (!err) {
      return cb(new Error("File " + dst + " exists."));
    }
    fs.rename(src, dst, copyIfFailed);
  });
};

exports.readAllFiles = function (fileDirs) {
  return iterateThroughDirectories(fileDirs, true)
};

exports.listAllFiles = function (fileDirs) {
  return iterateThroughDirectories(fileDirs, false)
}

function iterateThroughDirectories(fileDirs, shouldRead) {
  var files = [];

  _.each(fileDirs, function(directory) {
    var results = visitFiles(directory, shouldRead);
    files = files.concat(results);
  })

  return files;
}

function visitFiles(filename, shouldRead) {
  if (fs.statSync(filename).isFile()) {
    return shouldRead 
      ? [fs.readFileSync(filename)]
      : [filename];
  }

  var filenames = fs.readdirSync(filename);
  filenames = filenames.filter(function (fname) { return !(/^\..*$/.test(fname)); });
  filenames = filenames.map(function (fname) { return path.join(filename, fname); });
  var results = [];

  _.each(filenames, function(filename) {
    results = results.concat(visitFiles(filename, shouldRead));
  })

  return results;
}
