// TEST/UPDATEZONEDATA.JS --- Unit tests for the Route 53 update operation

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

// This exercises the aws-lambda-ec2-dyndns DNS update.  The key words
// "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
// "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document
// are to be interpreted as described in RFC 2119,
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
  describe('#updateZoneData()', function() {
    it('should create/update a DNS A resource record', function(done) {
      var callback = function() {
        done();
      };
      var changes = JSON.parse(fs.readFileSync('test/assets/dns-changes.json'));
      var data = {
        log: console.log,
        context: {},
        route53: {
          changeResourceRecordSets: function(options, callback) {
            callback(null, changes);
          }
        },
        ip_address: '192.0.2.100',
        zoneid: 'Z111111QQQQQQQ',
        hostname: 'example.com',
        rr_ttl: 300
      };
      index.updateZoneData(data)
        .then(function(data) {
          done();
        });
    });

    it('should report DNS update errors', function(done) {
      var callback = function() {
        done();
      };
      var err = {
        stack: null
      };
      var data = {
        log: console.log,
        context: {},
        route53: {
          changeResourceRecordSets: function(options, callback) {
            callback(err, null);
          }
        },
        ip_address: '192.0.2.100',
        zoneid: 'Z111111QQQQQQQ',
        hostname: 'example.com',
        rr_ttl: 300
      };
      index.updateZoneData(data)
        .catch(function(err) {
          assert.ok(err, 'updateZoneData threw an error due to API failure');
          done();
        });
    };
  });
});

// TEST/UPDATEZONEDATA.JS ends here.
