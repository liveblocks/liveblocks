function beforePacking(pkg) {
  delete pkg.devDependencies;
  delete pkg.scripts;
  return pkg;
}

module.exports = {
  hooks: {
    beforePacking,
  },
};
