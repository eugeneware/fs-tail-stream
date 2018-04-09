var redtape = require('redtape');
var path = require('path');
var concat = require('concat-stream');
var fst = require('..');
var fs = require('fs');
var it = redtape(beforeEach, afterEach);
var os = require('os');

function fixture (fileName) {
  return path.join(__dirname, 'fixtures', fileName);
}

var tmpFile = path.join(os.tmpdir(), 'lines-' + Date.now() + '.txt');
function beforeEach (cb) {
  fs.createReadStream(fixture('lines.txt'))
    .pipe(fs.createWriteStream(tmpFile))
    .once('finish', cb);
}

function afterEach (cb) {
  fs.unlink(tmpFile, cb);
}

it('should be able to read from a file', function (t) {
  t.plan(1);
  fst.createReadStream(fixture('lines.txt'), { encoding: 'utf8' })
    .on('close', t.end)
    .pipe(concat(function (data) {
      var expected = [
        'The way I see it, every life is a pile of good things and bad things.',
        'It\'s art!',
        'Heh-haa!',
        ''
      ].join('\n');
      t.equal(data, expected);
    }));
});

it('should be able to stream from a position in the file', function (t) {
  t.plan(1);
  fst.createReadStream(fixture('lines.txt'), { encoding: 'utf8', start: 70 })
    .on('close', t.end)
    .pipe(concat(function (data) {
      var expected = [
        'It\'s art!',
        'Heh-haa!',
        ''
      ].join('\n');
      t.equal(data, expected);
    }));
});

it('should be able to stream from a range in the file', function (t) {
  t.plan(1);
  fst.createReadStream(fixture('lines.txt'), {
    encoding: 'utf8', start: 70, end: 79
  })
    .on('close', t.end)
    .pipe(concat(function (data) {
      var expected = [
        'It\'s art!',
        ''
      ].join('\n');
      t.equal(data, expected);
    }));
});

it('should be able to stream from a growing file', function (t) {
  t.plan(1);
  var ws = fs.createWriteStream(tmpFile, { flags: 'a' });
  fst.createReadStream(tmpFile, { encoding: 'utf8', start: 80, tail: true })
    .on('sync', function () {
      var count = 0;
      var self = this;
      function write () {
        if (count++ < 3) {
          var data = 'new line ' + count + '\n';
          ws.write(data, 'utf8', function (err) {
            if (err) return t.error(err);
            setImmediate(write);
          });
        } else {
          self.close();
        }
      }
      write();
    })
    .pipe(concat(function (data) {
      var expected = [
        'Heh-haa!',
        'new line 1',
        'new line 2',
        'new line 3',
        ''
      ].join('\n');
      t.equal(data, expected);
      t.end();
    }));
});

it('should be able to stream from a growing file being streamed', function (t) {
  t.plan(1);
  var ws = fs.createWriteStream(tmpFile, { flags: 'a' });
  var rs = fst.createReadStream(tmpFile, { encoding: 'utf8', start: 80, tail: true });
  var byteCount = 0;
  rs
    .on('data', function (data) {
      byteCount += Buffer.byteLength(data);
      // wait until we've got everything
      if (byteCount === 42) {
        rs.close();
      }
    })
    .pipe(concat(function (data) {
      var expected = [
        'Heh-haa!',
        'new line 1',
        'new line 2',
        'new line 3',
        ''
      ].join('\n');
      t.equal(data, expected);
      t.end();
    }));

  var count = 0;
  function write () {
    if (count++ < 3) {
      var data = 'new line ' + count + '\n';
      ws.write(data, 'utf8', function (err) {
        if (err) return t.error(err);
        setImmediate(write);
      });
    }
  }
  write();
});

it('should stream Buffer instances when encoding is not set', function (t) {
  t.plan(3);
  var ws = fs.createWriteStream(tmpFile, { flags: 'a' });
  var rs = fst.createReadStream(tmpFile, { tail: true });

  rs.on('data', function (chunk) {
    t.ok(Buffer.isBuffer(chunk));
  });

  rs.on('sync', function () {
    setImmediate(function () {
      ws.write('test2\n', function (err) {
        t.ifError(err);
        rs.close();
      });
    });
  });
});
