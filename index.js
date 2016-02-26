var request = require('request');
var cheerio = require('cheerio');
var vow = require('vow');
var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');

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
      promises.push(processPost2(BASE_URL + $(e).find('a').attr('href'), i + 1)
        .then(savePost));
    }
  });

  /*vow.all(promises).done(formatOutput, function () {
    console.log('SOME PROMISES WERE REJECTED!', arguments);
  });*/

});

/**
 *
 * @param {Object} postObj
 * @param {String} [postObj.link]
 * @param {String} [postObj.title]
 * @param {Number} [postObj.number]
 * @param {String} [postObj.img]
 * @param {String} [postObj.text]
 * @param {String} [postObj.clearedText]
 */
function savePost(postObj) {
  var enFileName = _.template('posts/${number}.en.html')({ number: postObj.number });
  var ruFileName = _.template('posts/${number}.ru.html')({ number: postObj.number });

  var stream = fs.createWriteStream(enFileName);
  stream.write(postObj.title + '\n=====\n' + postObj.img + '\n=====\n' + postObj.text + '\n', function () {
    stream.close();
  });

  var ruStream = fs.createWriteStream(ruFileName);
  ruStream.write('\n=====\n' + postObj.img + '\n=====\n' + postObj.clearedText + '\n', function () {
    ruStream.close();
  });
// не работает
//  return vow.resolve();
}

function processPost2(link, number) {
  console.log('Processing post2:', link);
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
      return ['img', 'aside'].indexOf(node.name.toLowerCase()) === -1
        || node.classList.has('dt-share');
    });

    var contentStrings = contentNodes.map(function (i, node) {
      return $$('<div>').append(node).html();
    });

    var clearedContentStrings = contentNodes.map(function (i, node) {
      return $$('<div>').append(node).find(':not(pre)').each(function (i, e) {
        $$(e).text('');
      });
    });

    var text = Array.prototype.slice.call(contentStrings).join('\n');
    var clearedText = Array.prototype.slice.call(clearedContentStrings).join('\n');

    if (!text) {
      def.reject({ error: true, text: 'Text was not found', number: number, link: link });
      return;
    }

    def.resolve({
      link: link,
      number: number,
      title: title,
      img: src,
      text: text,
      clearedText: clearedText
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
    output += _.template('<anchor>${number}</anchor>\
<h2>${number}. ${title} (${link})</h2>\n')(post);
    output += post.text + '\n\n';
    output += _.template('<anchor>${number}</anchor>\
<h2>${number}. </h2>\n')(post);
    output += post.text + '\n\n';
    output += _.template('<spoiler title="Посмотреть скринкаст">\
<img src="${img}"/>\
</spoiler>\n')(post);
  });

  var stream = fs.createWriteStream(_.template('texts/${since} - ${last}.html')({since: SINCE + 1, last: SINCE + COUNT}));
  stream.write(output);
  stream.close();
}
