const spawn = require('cross-spawn');

// const child = spawn('npm', ['list', '-g', '-depth', '0'], { stdio: 'inherit' });
const ls = spawn('git', ['status']);

ls.stdout.on('data', buffer => {
  console.log(buffer.toString());
});
