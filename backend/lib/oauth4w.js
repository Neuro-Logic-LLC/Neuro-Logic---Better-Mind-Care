let modPromise;
module.exports = function getOauth4w() {
  if (!modPromise) modPromise = import('oauth4webapi');
  return modPromise;
};