/**
 * Created by tgxh on 2017/7/4.
 */
const cheerio = require('cheerio')
const express = require('express')
const app = express()
const superagent = require('superagent')
require('superagent-charset')(superagent)
const async = require('async');

let total = 0 //总章节数
let id = 0 //计数器
const chapters = 10 //爬取多少章
const url = 'http://www.zwdu.com/book/8634/'

//去除前后空格和&nbsp;转义字符
function trim(str) {
  return str.replace(/(^\s*)|(\s*$)/g, '').replace(/&nbsp;/g, '')
}

//将Unicode转汉字
function reconvert(str) {
  str = str.replace(/(&#x)(\w{1,4});/gi, function ($0) {
    return String.fromCharCode(parseInt(escape($0).replace(/(%26%23x)(\w{1,4})(%3B)/g, "$2"), 16));
  });
  return str
}

function fetchUrl(url, callback, id) {
  superagent.get(url)
    .charset('gbk')
    .end(function (err, res) {
      let $ = cheerio.load(res.text)
      const arr = []
      const content = reconvert($("#content").html())
      //分析结构后分割html
      const contentArr = content.split('<br><br>')
      contentArr.forEach(elem => {
        const data = trim(elem.toString())
        arr.push(data)
      })
      const obj = {
        id: id,
        err: 0,
        bookName: $('.footer_cont a').text(),
        title: $('.bookname h1').text(),
        content: arr.join('-')  //由于需要保存至mysql中，不支持直接保存数组，所以将数组拼接成字符串，取出时再分割字符串即可
      }
      callback(null, obj)
    })
}

app.get('/', function (req, response, next) {
  superagent.get(url)
    .charset('gbk')
    .end(function (err, res) {
      var $ = cheerio.load(res.text);
      let urls = []
      total = $('#list dd').length
      console.log(`共${$('#list dd').length}章`)
      $('#list dd').each(function (i, v) {
        if (i < chapters) {
          urls.push('http://www.zwdu.com' + $(v).find('a').attr('href'))
        }
      })

      async.mapLimit(urls, 10, function (url, callback) {
        id++
        fetchUrl(url, callback, id) //需要对章节编号，所以通过变量id来计数
      }, function (err, results) {
        response.send(results)
      })
    })
})

app.listen(3378, function () {
  console.log('server listening on 3378')
})