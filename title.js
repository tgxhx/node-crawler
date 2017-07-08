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
urls = urls.slice(0)

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'book2',
  port: 3306
})

let id = 0 //计数器

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
      let content = []
      $('#list dd').each((i,v) => {
        content.push($(v).find('a').text())
      })
      let obj = {
        id: id,
        name: $('#info h1').text(),
        titles: content.join('-')
      }
      console.log(id)
      callback(null, obj)
    })
}

function saveToMysql(results) {
  results.forEach(function (result) {
    pool.query('insert into booktitles set ?', result, function (err, result1) {
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