/**
 * Created by 12 on 2017/7/5.
 */
const cheerio = require('cheerio')
const mysql = require('mysql')
const express = require('express')
const app = express()
const superagent = require('superagent')
require('superagent-charset')(superagent)
const async = require('async');
let urls = require('./urls')
urls = urls.slice(0,10) //爬取多少书籍的信息

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'book2',
  port: 3306
})

let id = 0 //计数器

function booktype(str) {
  if (str.indexOf('连载') !== -1) {
    return '连载'
  } else if (str.indexOf('完结') !== -1) {
    return '完本'
  }
}

//将Unicode转汉字
function reconvert(str) {
  str = str.replace(/(&#x)(\w{1,4});/gi, function ($0) {
    return String.fromCharCode(parseInt(escape($0).replace(/(%26%23x)(\w{1,4})(%3B)/g, "$2"), 16));
  });
  return str;
}


function fetList(url, callback, id) {
  superagent.get(url)
    .charset('gbk')
    .end(function (err, res) {
      const $ = cheerio.load(res.text);
      let author = $('#info p').first().text().substr($('#info p').first().text().indexOf('：') + 1)
      let like = []
      for (var i = 0; i < 3; i++) {
        like.push(Math.round(Math.random() * (150 - 1) + 1))
      }
      let intro = ''
      $('#intro p').each(function (i, v) {
        intro += '-' + $(v).text().trim()
      })
      var obj = {
        id: id,
        name: $('#info h1').text(),
        author: author,
        images: $('#fmimg img').attr('src'),
        ratings: parseFloat(Math.random() * 2 + 3).toFixed(1), //随机评分
        wordcount: (Math.random() * 200 + 100).toFixed(2),  //随机字数
        type: $('.con_top a').eq(1).text().substr(0, 2),  //书籍类型
        intro: $('#intro p').first().text().trim(),  //书记介绍
        serialize: booktype($('#info p').eq(1).text()), //连载还是完结
        like: like.join('-')  //随机生成相似推荐
      }
      console.log(id)
      callback(null, obj)
    })
}

function saveToMysql(results) {
  results.forEach(function (result) {
    pool.query('insert into booklist set ?', result, function (err, result1) {
      if (err) throw err
      console.log(`insert ${result.id} success`)
    })
  })
}

app.get('/', function (req, response) {
  async.mapLimit(urls, 5, function (url, callback) {
    id++
    fetList(url, callback, id)
  }, function (err, results) {
    response.send(results)
    saveToMysql(results)
  })
})

app.listen('3379', function () {
  console.log('server listening on 3379')
})