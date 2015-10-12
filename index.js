var request = require('request');
var cheerio = require('cheerio');
var vow = require('vow');
var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));

var $;

if (argv['_'].length < 2) {
  console.error('Wrong parameters; usage: node index.js since_number posts_count');
  return;
}

var SINCE = parseInt(argv['_'][0]);
var COUNT = parseInt(argv['_'][1]);


var BASE_URL = 'https://umaar.com';
var INTRO = 'Бла Бла Бла';

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
      promises.push(processPost(BASE_URL + $(e).find('a').attr('href'), i + 1));
    }
  });

  vow.all(promises).then(formatOutput).catch(function () {
    console.log('SOME PROMISES WERE REJECTED!', arguments);
  });

});

function processPost(link, number) {
  console.log('Processing post:', link);

  var def = vow.defer();

  request(link, function (error, response, body) {
    if (error) {
      console.error('  ERROR:', error);
      def.reject({ error: true, text: error, number: number, link: link });
      return;
    }

    if (response.statusCode !== 200) {
      console.error('  WRONG STATUS CODE:', response.statusCode);
      def.reject({ error: true, text: 'WRONG STATUS CODE: ' + response.statusCode, number: number, link: link });
      return;
    }

    var $$ = cheerio.load(body);
    var title = $$('.dt-tip h3').text();
    if (!title) {
      def.reject({ error: true, text: 'Title was not found', number: number, link: link });
      return;
    }
    var src = $$('.dt-content img').attr('src');
    if (!src) {
      def.reject({ error: true, text: 'Image was not found', number: number, link: link });
      return;
    }

    var contentNodes = $$('.dt-content > *').filter(function (i, node) {
      return node.name.toLowerCase() !== 'img';
    });

    var contentStrings = contentNodes.map(function (i, node) {
      return $$('<div>').append(node).html();
    });

    var text = Array.prototype.slice.call(contentStrings).join('\n');

    if (!text) {
      def.reject({ error: true, text: 'Text was not found', number: number, link: link });
      return;
    }

    def.resolve({
      link: link,
      number: number,
      title: title,
      img: src,
      text: text
    });

  });

  return def.promise();
}

function formatOutput(postsArray) {
  var posts = postsArray.sort(function (a, b) {
    return a.number - b.number;
  });

  // формируем заглавие
  var output = INTRO + '\n\n';
  output += '<strong>Содержание</strong>:\n';

  output += _.template('<ol start="${since}">\n')({ since: SINCE + 1 });
  posts.forEach(function (post) {
    output += _.template('<li><a href="#${number}">${ title }</a></li>\n')(post);
  });
  output += '</ol>\n';

  output += _.template('<ol start="${since}">\n')({ since: SINCE + 1 });
  posts.forEach(function (post) {
    output += _.template('<li><a href="#${number}">$</a></li>\n')(post);
  });
  output += '</ol>\n';

  output += '<cut />\n';

  posts.forEach(function (post) {
    output += '<cut />\n';
    output += _.template('<anchor>${number}</anchor> \
      <h2>${number}. ${title} (${link})</h2>\n')(post);
    output += post.text + '\n';
    output += _.template('<spoiler title="Посмотреть скринкаст">\
<img src="${img}"/>\
</spoiler>')(post);
  });

  console.log(output);
}
