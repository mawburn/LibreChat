const ClinicFlame = require('@clinic/flame');
const flame = new ClinicFlame();

flame.collect(['node', './api/server/index'], function (err, filepath) {
  if (err) {
    throw err;
  }

  flame.visualize(filepath, filepath + '.html', function (err) {
    if (err) {
      throw err;
    }
  });
});
