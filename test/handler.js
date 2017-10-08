// TEST/HANDLER.JS --- Unit tests for the event handler

// Copyright (c) 2017, Matthew X. Economou <xenophon@irtnog.org>
//
// Licensed under the Apache License, Version 2.0 (the "License"); you
// may not use this file except in compliance with the License.  You
// may obtain a copy of the License at:
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied.  See the License for the specific language governing
// permissions and limitations under the License.

// This exercises the aws-lambda-ec2-dyndns event handler itself.  The
// key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
// "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in
// this document are to be interpreted as described in RFC 2119,
// https://tools.ietf.org/html/rfc2119.  The key words "MUST (BUT WE
// KNOW YOU WON'T)", "SHOULD CONSIDER", "REALLY SHOULD NOT", "OUGHT
// TO", "WOULD PROBABLY", "MAY WISH TO", "COULD", "POSSIBLE", and
// "MIGHT" in this document are to be interpreted as described in RFC
// 6919, https://tools.ietf.org/html/rfc6919.  The keywords "DANGER",
// "WARNING", and "CAUTION" in this document are to be interpreted as
// described in OSHA 1910.145,
// https://www.osha.gov/pls/oshaweb/owadisp.show_document?p_table=standards&p_id=9794.

var assert = require('assert');
var fs = require('fs');

var index = require('../index');

describe('index.js', function() {
  describe('#handler()', function() {
    it('mock data should result in a success', function(done) {
      var event = JSON.parse(fs.readFileSync('test/assets/event.json'));
      var metadata = JSON.parse(fs.readFileSync('test/assets/instance-metadata.json'));
      var context = {};
      var callback = function() {
        done();
      };
      var overrides = {
        ec2: {
          describeInstances: function(options, callback) {
            callback(null, metadata);
          }
        },
        route53: {
          changeResourceRecordSets: function(options, callback) {
            callback(null);
          }
        },
      };
      index.handler(event, context, callback, overrides);
    });

    it('alternate mock data should result in a success', function(done) {
      var event = JSON.parse(fs.readFileSync('test/assets/event.json'));
      var metadata = JSON.parse(fs.readFileSync('test/assets/instance-metadata-alt-ttl.json'));
      var context = {};
      var callback = function() {
        done();
      };
      var overrides = {
        ec2: {
          describeInstances: function(options, callback) {
            callback(null, metadata);
          }
        },
        route53: {
          changeResourceRecordSets: function(options, callback) {
            callback(null);
          }
        }
      };
      index.handler(event, context, callback, overrides);
    });

    it('alternate alternate mock data should result in a failure', function(done) {
      var event = JSON.parse(fs.readFileSync('test/assets/event.json'));
      var metadata = JSON.parse(fs.readFileSync('test/assets/no-instance-metadata.json'));
      var context = {};
      var callback = function() {
        done();
      };
      var overrides = {
        log: function() {
          assert.ok(true, 'custom log function called successfully');
        },
        ec2: {
          describeInstances: function(options, callback) {
            callback(null, metadata);
          }
        },
        route53: {
          changeResourceRecordSets: function(options, callback) {
            callback(nulll);
          }
        }
      };
      index.handler(event, context, callback, overrides);
    });

    it('should accept functions as steps', function(done) {
      var event = {};
      var context = {};
      var callback = function() {};
      var overrides = {
        steps: [
          function(data) {
            if (data && data.context) {
              done();
            }
          }
        ]
      };
      index.handler(event, context, callback, overrides);
    });

    it('should report failure for invalid steps', function(done) {
      var event = {};
      var context = {};
      var callback = function(err) {
        done(err ? null : true);
      };
      var overrides = {
        steps: [
          1,
          ['test']
        ]
      };
      index.handler(event, content, callback, overrides);
    });

    it('should report failure for steps passing an error', function(done) {
      var event = {};
      var context = {};
      var callback = function(err) {
        done(err ? null : true);
      };
      var overrides = {
        steps: [
          function(data, next) {
            next(true, data);
          }
        ],
        log: function() {
          assert.ok(true, 'custom log function called successfully');
        }
      };
      index.handler(event, context, callback, overrides);
    });
  });
});

// Local Variables:
// js-indent-level: 2
// End:

// INDEX.JS ends here.
