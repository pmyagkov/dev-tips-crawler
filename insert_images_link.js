var fs = require('fs');
var _ = require('lodash');
var path = require('path');

var readline = require('readline');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});


var parts;
var rootDir = path.dirname(__filename);
var POSTS_FOLDER = 'posts';
var SPLIT_EXPR = '=====';

rl.on('line', function (line) {
  parts = _(line.split(' ')).map(function (l) {
    return l.replace('/[\n ]/g', '');
  }).compact().value();

  if (parts.length !== 2) {
    console.error('Parts length is not 2:', parts.length);
    process.exit(1);
  }

  console.log('Processing:', parts[0], parts[1]);

  var reResult = /^\d+/.exec(parts[0]);
  if (!reResult) {
    console.error(' Node integer part in images filename');
    process.exit(1);
  }

  var postNumber = reResult[0];
  console.log(' Post number', postNumber);

  var folderPath = path.join(rootDir, POSTS_FOLDER);

  var folderFiles = fs.readdirSync(folderPath);
  folderFiles
    .filter(function (filename) {
      return filename.indexOf(postNumber) > -1;
    })
    .forEach(function (filename) {
      var filePath = path.join(rootDir, POSTS_FOLDER, filename);
      console.log(' Found file:', filePath);

      insertImageLinkToPost(parts[1], filePath);
    });
});

function insertImageLinkToPost(link, filePath) {
  var fileContent = fs.readFileSync(filePath, 'utf8');
  var split = fileContent.split(SPLIT_EXPR);

  if (split.length <= 1) {
    console.log(' Can\'t process file', filePath, '. No split parts!');
    return;
  }

  split[1] = '\n' + link + '\n';
  fileContent = split.join(SPLIT_EXPR);
  fs.writeFileSync(filePath, fileContent, 'utf8');

  console.log(' Content to file is written');
}
