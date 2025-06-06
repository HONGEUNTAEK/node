const http = require('http');
const fs = require('fs');
const url = require('url');
const qs = require('querystring');
const template = require('./lib/template.js');
const path = require('path');
const sanitizeHtml = require('sanitize-html');

const dataFile = './data.json';

function readData(callback) {
  fs.readFile(dataFile, 'utf8', (err, data) => {
    if (err) return callback({});
    try {
      const obj = JSON.parse(data);
      callback(obj);
    } catch {
      callback({});
    }
  });
}

function writeData(dataObj, callback) {
  fs.writeFile(dataFile, JSON.stringify(dataObj, null, 2), 'utf8', callback);
}

const app = http.createServer(function(request, response) {
  const _url = request.url;
  const queryData = url.parse(_url, true).query;
  const pathname = url.parse(_url, true).pathname;

  if (pathname === '/') {
    if (queryData.id === undefined) {
      readData(function(dataObj) {
        const filelist = Object.keys(dataObj);
        const title = 'Welcome';
        const description = 'Hello, Node.js';
        const list = template.list(filelist);
        const html = template.HTML(title, list,
          `<h2>${title}</h2>${description}`,
          `<a href="/create">create</a>`
        );
        response.writeHead(200);
        response.end(html);
      });
    } else {
      readData(function(dataObj) {
        const id = path.parse(queryData.id).base;
        const title = id;
        const description = dataObj[id];
        if (!description) {
          response.writeHead(404);
          response.end('Not found');
          return;
        }
        const sanitizedTitle = sanitizeHtml(title);
        const sanitizedDescription = sanitizeHtml(description, {allowedTags:['h1']});
        const filelist = Object.keys(dataObj);
        const list = template.list(filelist);
        const html = template.HTML(sanitizedTitle, list,
          `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
          `<a href="/create">create</a>
          <a href="/update?id=${sanitizedTitle}">update</a>
          <form action="delete_process" method="post">
            <input type="hidden" name="id" value="${sanitizedTitle}">
            <input type="submit" value="delete">
          </form>`
        );
        response.writeHead(200);
        response.end(html);
      });
    }
  } else if (pathname === '/create') {
    readData(function(dataObj) {
      const title = 'WEB - create';
      const list = template.list(Object.keys(dataObj));
      const html = template.HTML(title, list, `
        <form action="/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p>
            <textarea name="description" placeholder="description"></textarea>
          </p>
          <p>
            <input type="submit">
          </p>
        </form>
      `, '');
      response.writeHead(200);
      response.end(html);
    });
  } else if (pathname === '/create_process') {
    let body = '';
    request.on('data', function(data) {
      body += data;
    });
    request.on('end', function() {
      const post = qs.parse(body);
      const title = post.title;
      const description = post.description;
      readData(function(dataObj) {
        dataObj[title] = description;
        writeData(dataObj, function(err) {
          response.writeHead(302, { Location: `/?id=${title}` });
          response.end();
        });
      });
    });
  } else if (pathname === '/update') {
    readData(function(dataObj) {
      const id = path.parse(queryData.id).base;
      const title = id;
      const description = dataObj[id];
      if (!description) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      const list = template.list(Object.keys(dataObj));
      const html = template.HTML(title, list,
        `<form action="/update_process" method="post">
          <input type="hidden" name="id" value="${title}">
          <p><input type="text" name="title" placeholder="title" value="${title}"></p>
          <p>
            <textarea name="description" placeholder="description">${description}</textarea>
          </p>
          <p>
            <input type="submit">
          </p>
        </form>`,
        `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`
      );
      response.writeHead(200);
      response.end(html);
    });
  } else if (pathname === '/update_process') {
    let body = '';
    request.on('data', function(data) {
      body += data;
    });
    request.on('end', function() {
      const post = qs.parse(body);
      const id = post.id;
      const title = post.title;
      const description = post.description;
      readData(function(dataObj) {
        // 파일 이름 바꾸기 대신 key 변경
        if (id !== title) {
          delete dataObj[id];
        }
        dataObj[title] = description;
        writeData(dataObj, function(err) {
          response.writeHead(302, { Location: `/?id=${title}` });
          response.end();
        });
      });
    });
  } else if (pathname === '/delete_process') {
    let body = '';
    request.on('data', function(data) {
      body += data;
    });
    request.on('end', function() {
      const post = qs.parse(body);
      const id = path.parse(post.id).base;
      readData(function(dataObj) {
        delete dataObj[id];
        writeData(dataObj, function(err) {
          response.writeHead(302, { Location: `/` });
          response.end();
        });
      });
    });
  } else {
    response.writeHead(404);
    response.end('Not found');
  }
});

app.listen(3000);
