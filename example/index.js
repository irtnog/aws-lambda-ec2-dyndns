var DynamicDnsUpdater = require('aws-lambda-ec2-dyndns');

exports.handler = function(event, context, callback) {
  // See aws-lambda-ec2-dyndns/index.js for all options.
  var overrides = {
    config: {
      hostname_tag: 'Name',
      default_ttl: 60
    }
  };
  DynamicDnsUpdater.handler(event, context, callback, overrides);
};
