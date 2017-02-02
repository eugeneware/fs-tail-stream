# fs-tail-stream

`fs.createReadStream` that supports ongoing tailing of files

[![build status](https://secure.travis-ci.org/eugeneware/fs-tail-stream.png)](http://travis-ci.org/eugeneware/fs-tail-stream)

The built in `fs.createReadStream` function stops streaming once the file has
come to an end.

If you want to tail the file so that it keeps streaming data when the file grows
then you're out of luck.

This module adds a `{ tail: true }` option to the options which will keep
streaming data as data is added to the file, or until the `.close()` method
is called on the read stream.

Because this module wraps the underlying `fs.createReadStream` function all
the options work as expected.

## Installation

This module is installed via npm:

``` bash
$ npm install fs-tail-stream
```

## Example Usage

``` js
var fst = require('fs-tail-stream');
var fs = require('fs');
var ws = fs.createWriteStream(tmpFile, { flags: 'a' });

// file with the text 'hello' in it
var tmpFile = '/tmp/my-temp-file.txt';

// same parameters as `fs.createReadStream`, but pass through `tail: true`
fst.createReadStream(tmpFile, { encoding: 'utf8', start: 80, tail: true })
  .on('sync', function () {
    // called when at the end of the file
    var self = this;
    // write some new data to the file
    ws.write('world', 'utf8', function (err) {
      // stop watching for files, and let the file stream end
      // otherwise the file watching will be indefinite and the process
      // won't' exit
      self.close();
    });
  })
  // will print out both the existing contents of the file, plus the
  // newly added data
  .on('data', console.log);
  // prints out:
  //   hello
  //   world
```
