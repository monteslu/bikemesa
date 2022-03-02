const fs = require('fs').promises;
const fse = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const config = require('./config');


if (fse.existsSync(path.join(__dirname, 'build'))) {
  fse.rmdirSync(path.join(__dirname, 'build'), {recursive: true});
}

fse.mkdirp('build');

fse.copy(path.join(__dirname, 'static'), path.join(__dirname, 'build'), err => {
  if (err) return console.error(err);
  console.log('success!');
});

async function walk(dir, fileList = []) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const stat = await fs.stat(path.join(dir, file))
    if (stat.isDirectory()) fileList = await walk(path.join(dir, file), fileList)
    else fileList.push(path.join(dir, file))
  }
  return fileList
}

walk(path.join(__dirname, 'pages')).then((allFiles) => {
  console.log(allFiles);
  allFiles.forEach(async (f) => {
    const text = await (await fs.readFile(f)).toString();
    const html = ejs.render(text, { 
      config,
      pages: path.join(__dirname, 'pages/'),
      partials: path.join(__dirname, 'partials/'),
    });
    console.log(f, f.replace('/pages/', '/build/').replace('.ejs', '.html'));
    console.log(html);
    fs.writeFile(f.replace('/pages/', '/build/').replace('.ejs', '.html'), html, (err) => {
      if (err) {
        console.log('error writing', err);
      }
    });
  });
});


// allFiles.forEach((f) => {
//   const html = ejs.render(fs.readFileSync(f), { config });
//   console.log(f);
//   console.log(html);
// });