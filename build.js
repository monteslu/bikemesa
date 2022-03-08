const fse = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const nhp = require('node-html-parser');

const config = require('./config');

const { parse } = nhp;
const fsp = fse.promises;

if (fse.existsSync(path.join(__dirname, 'dist'))) {
  fse.rmdirSync(path.join(__dirname, 'dist'), {recursive: true});
}

fse.mkdirpSync('dist');

fse.copy(path.join(__dirname, 'static'), path.join(__dirname, 'dist'), err => {
  if (err) return console.error(err);
  console.log('success!');
});

async function walk(dir, fileList = []) {
  const files = await fsp.readdir(dir);
  for (const file of files) {
    const stat = await fsp.stat(path.join(dir, file));
    if (stat.isDirectory()) {
      fileList = await walk(path.join(dir, file), fileList);
    } else {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const fileMap = {};
const pages = path.join(__dirname, 'pages/');
const partials = path.join(__dirname, 'partials/');

config.blogs = [];

walk(path.join(__dirname, 'pages')).then(async (allFiles) => {
  console.log(allFiles);
  for (const fileName of allFiles) {
    const text = await (await fsp.readFile(fileName)).toString();
    const parsed = parse(text);
    const outputFilename = fileName.replace('/pages/', '/dist/').replace('.ejs', '.html');
    const link = outputFilename.substring((__dirname + '/dist').length);
    const pageConfig = { link };
    const fObj = { text, parsed, fileName, outputFilename, config: pageConfig };
    fileMap[fileName] = fObj;
    if (parsed.childNodes && parsed.childNodes[0]) {
      const raw = ('' + parsed.childNodes[0].rawText).trim();
      if (raw.startsWith('<%#')) {
        const toParse = ('' + raw.split('%>')[0]).trim().substring(3).trim();
        try {
          fObj.config = { ...fObj.config, ...JSON.parse(toParse) };
          if (fObj.config.type === 'blog') {
            config.blogs.push(fObj);
          }
        } catch (e) {
          console.log('error parsing page config', e);
        }
      }
    }
    fObj.config.type = fObj.config.type || 'page';
    fObj.config.title = fObj.config.title || config.title;
    console.log(fObj.config);
  }
  
  config.blogs = config.blogs.sort((a, b) => {
    if (a.config.date > b.config.date) {
      return -1;
    }
    if (a.config.date < b.config.date) {
      return 1;
    }
    return 0;
  });

  allFiles.forEach(async (f) => {
    const fObj = fileMap[f];
    const html = ejs.render(fObj.text, { config, pages, partials, pageConfig: fObj.config });
    
    fse.mkdirpSync(path.dirname(fObj.outputFilename));
    console.log(fObj.outputFilename);
    fse.writeFile(f.replace('/pages/', '/dist/').replace('.ejs', '.html'), html, (err) => {
      if (err) {
        console.log('error writing', err);
      }
    });
  });
});

