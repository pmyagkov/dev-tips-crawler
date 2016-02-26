var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
var path = require('path');
var consts = require('./consts');

var $;

if (argv['_'].length < 2) {
  console.error('Wrong parameters; usage: node index.js since_number posts_count');
  return;
}

var SINCE = parseInt(argv['_'][0]);
var COUNT = parseInt(argv['_'][1]);
var ARTICLE_LINK = argv['_'][2];

var INTRO = 'Паша, вставь сюда текст. Это вступление.';

var FILENAME_TEMPLATE = '${number}.ru.html';
var fileName, filePath, fileContent;
var split;

var posts = [];
for (var i = SINCE; i < SINCE + COUNT; i++) {
  fileName = _.template(FILENAME_TEMPLATE)({ number: i + 1 });
  filePath = path.join(path.dirname(__filename), consts.POSTS_FOLDER, fileName);

  fileContent = fs.readFileSync(filePath, 'utf8');
  split = fileContent.split(consts.SPLIT_EXPR);

  posts.push({
    number: i + 1,
    title: split[0].replace(/\n/g, ''),
    img: split[1].replace(/\n/g, ''),
    text: split[2]
  });
}

compileArticle(posts, ARTICLE_LINK);

/**
 *
 * @param {Object[]} postsArray
 * @param {Number} postsArray[].number
 * @param {String} postsArray[].title
 * @param {String} postsArray[].text
 * @param {String} postsArray[].img
 */
function compileArticle(postsArray, articleLink) {
  articleLink = articleLink || '';

  var posts = postsArray.sort(function (a, b) {
    return a.number - b.number;
  });

  // формируем заглавие
  var output = INTRO + '\n\n';
  output += '<strong>Содержание</strong>:\n';

  posts.forEach(function (post) {
    post.articleLink = articleLink;
    output +=
      _.template('&nbsp;&nbsp;&nbsp;${number}&nbsp;&nbsp;&nbsp;' +
        '<a href="${articleLink}#${number}">${ title }</a>\n')(post);
  });

  output += '<cut />\n';

  posts.forEach(function (post) {
    output += _.template('<anchor>${number}</anchor><h2>${number}. ${title}</h2>')(post);

    output += post.text + '\n\n';

    output += _.template(
      '<spoiler title="Посмотреть скринкаст"><img src="${img}"/></spoiler>\n'
    )(post);
  });

  fileName = _.template('articles/${since} - ${last}.html')(
    { since: postsArray[0].number, last: postsArray[postsArray.length - 1].number }
  );

  var stream = fs.createWriteStream(fileName);
  stream.write(output);
  stream.close();

  console.log('Article "', fileName, '" created');
}
