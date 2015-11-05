var request = require('request');
var cheerio = require('cheerio');
var vow = require('vow');
var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');

// ./upload_pic.sh 5dsankjct1csbo0r6lp0vlh1j0 /Users/p.myagkov/Downloads/yep_360.jpg

var $;

if (argv['_'].length < 2) {
  console.error('Wrong parameters; usage: node index.js since_number posts_count');
  return;
}

var SINCE = parseInt(argv['_'][0]);
var COUNT = parseInt(argv['_'][1]);

var BASE_URL = 'https://umaar.com';

request(BASE_URL + '/dev-tips/', function (error, response, body) {
  if (error) {
    console.error('ERROR:', error);
    return;
  }

  if (response.statusCode !== 200) {
    console.error('WRONG STATUS CODE:', response.statusCode);
    return;
  }

  $ = cheerio.load(body);

  var promises = [];

  $('.dt-archive ol li').each(function(i, e) {
    if (i >= SINCE && i < SINCE + COUNT) {
      promises.push(findImage(BASE_URL + $(e).find('a').attr('href'), i + 1));
    }
  });

});

function findImage(link, number) {
  request(link, function (error, response, body) {
    if (error) {
      console.error('  ERROR:', error);
      //def.reject({ error: true, text: error, number: number, link: link });
      return;
    }

    if (response.statusCode !== 200) {
      console.error('  WRONG STATUS CODE:', response.statusCode);
      //def.reject({ error: true, text: 'WRONG STATUS CODE: ' + response.statusCode, number: number, link: link });
      return;
    }

    var $$ = cheerio.load(body);
    var img = $$('.dt-tip img').attr('src');
    if (!img) {
      //def.reject({ error: true, text: 'Title was not found', number: number, link: link });
      return;
    }

    console.log('IMG FOUND: ', img);

    request(BASE_URL + img).pipe(fs.createWriteStream(_.template('images/${number}-${name}')({
      number: number, name: _.last(img.split('/'))
    })));
  });
};
