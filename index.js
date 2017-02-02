var fs = require('fs');
var stream = require('stream');
var once = require('once');

module.exports = createReadStream;
module.exports.createReadStream = createReadStream;

function createReadStream (path, options) {
  var ds = stream.Duplex({ objectMode: true });
  options.autoClose = false;
  var tail = options && !options.end && options.tail;
  var bytesRead = 0;
  ds._read = once(function () {
    var rs = fs.createReadStream(path, options);
    var chunkSize = 64 * 1024;
    var pos = 0;
    var watcher;
    var reading = false;
    var watching = false;
    var synced = false;
    rs
      .once('open', function () {
        chunkSize = rs._readableState.highWaterMark;
        if (tail) {
          watcher = fs.watch(path, function (eventType, fileName) {
            // only kick of a read if already hit the end of the file
            if (!reading && synced) {
              reading = true;
              readChunk();
            }
          });
          watching = true;
          ds.close = function () {
            watching = false;
            watcher.close();
            if (!reading) {
              ds.push(null);
            }
          };
        }
      })
      .once('end', function () {
        pos = bytesRead + (options && options.start || 0);
        if (!tail) {
          ds.push(null);
        }
        synced = true;
        ds.emit('sync');
      })
      .pipe(ds, { end: false });

    function readChunk () {
      var b = Buffer.alloc(chunkSize);
      fs.read(rs.fd, b, 0, chunkSize, pos, function (err, bytesRead) {
        if (err) return ds.emit(err);
        if (bytesRead) {
          pos += bytesRead;
          var data = b.slice(0, bytesRead).toString(options.encoding);
          ds.push(data);
          setImmediate(readChunk);
        } else if (reading) {
          reading = false;
          if (!watching) {
            ds.push(null);
          }
        }
      });
    }
  });

  ds._write = function (data, enc, cb) {
    bytesRead += Buffer.byteLength(data);
    ds.push(data);
    cb();
  };

  return ds;
}
