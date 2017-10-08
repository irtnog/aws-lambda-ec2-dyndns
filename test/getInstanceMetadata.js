// TEST/GETINSTANCEMETADATA.JS --- Unit tests for the EC2 instance metadata query

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

// This exercises the aws-lambda-ec2-dyndns instance lookup.  The key
// words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
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
  describe('#getInstanceMetadata()', function() {
    it('should return the public IP address and relevant tag-values of the instance (default TTL)', function(done) {
      var callback = function() {
        done();
      };
      var metadata = JSON.parse(fs.readFileSync('test/assets/instance-metadata.json'));
      var data = {
        log: console.log,
        context: {},
        config: {
          zoneid_tag: 'dyndns:zoneid',
          hostname_tag: 'dyndns:hostname',
          rr_ttl_tag: 'dyndns:rr-ttl',
          default_ttl: 300
        },
        ec2: {
          describeInstances: function(options, callback) {
            callback(null, metadata);
          }
        },
        instance_id: 'i-abcd1111'
      };
      index.getInstanceMetadata(data)
        .then(function(data) {
          assert.equal(data.ip_address,
                       '192.0.2.100',
                       'getInstanceMetadata retrieved the public IP address');
          assert.equal(data.zoneid,
                       'Z111111QQQQQQQ',
                       'getInstanceMetadata retrieved the hosted zone ID');
          assert.equal(data.hostname,
                       'example.com',
                       'getInstanceMetadata retrieved the hostname');
          assert.equal(data.rr_ttl,
                       300,
                       'getInstanceMetadata set the default TTL');
          done();
        });
    });

    it('should return the public IP address and relevant tag-values of the instance (alternate TTL)', function(done) {
      var callback = function() {
        done();
      };
      var metadata = JSON.parse(fs.readFileSync('test/assets/instance-metadata-alt-ttl.json'));
      var data = {
        log: console.log,
        context: {},
        config: {
          zoneid_tag: 'dyndns:zoneid',
          hostname_tag: 'dyndns:hostname',
          rr_ttl_tag: 'dyndns:rr-ttl',
          default_ttl: 300
        },
        ec2: {
          describeInstances: function(options, callback) {
            callback(null, metadata);
          }
        },
        instance_id: 'i-abcd1111'
      };
      index.getInstanceMetadata(data)
        .then(function(data) {
          assert.equal(data.ip_address,
                       '192.0.2.100',
                       'getInstanceMetadata retrieved the public IP address');
          assert.equal(data.zoneid,
                       'Z111111QQQQQQQ',
                       'getInstanceMetadata retrieved the hosted zone ID');
          assert.equal(data.hostname,
                       'example.com',
                       'getInstanceMetadata retrieved the hostname');
          assert.equal(data.rr_ttl,
                       60,
                       'getInstanceMetadata retrieved the TTL');
          done();
        });
    });

    it('should reject an instance that lacks the relevant tags', function(done) {
      var callback = function() {
        done();
      };
      var metadata = JSON.parse(fs.readFileSync('test/assets/no-instance-metadata.json'));
      var data = {
        log: console.log,
        context: {},
        config: {
          zoneid_tag: 'dyndns:zoneid',
          hostname_tag: 'dyndns:hostname',
          rr_ttl_tag: 'dyndns:rr-ttl',
          default_ttl: 300
        },
        ec2: {
          describeInstances: function(options, callback) {
            callback(null, metadata);
          }
        },
        instance_id: 'i-abcd1111'
      };
      index.getInstanceMetadata(data)
        .catch(function(err) {
          assert.ok(err, 'getInstanceMetadata threw an error due to null results');
          done();
        });
    });

    it('should report API failures', function(done) {
      var callback = function() {
        done();
      };
      var err = {
        stack: null
      };
      var data = {
        log: console.log,
        context: {},
        config: {
          zoneid_tag: 'dyndns:zoneid',
          hostname_tag: 'dyndns:hostname',
          rr_ttl_tag: 'dyndns:rr-ttl',
          default_ttl: 300
        },
        ec2: {
          describeInstances: function(options, callback) {
            callback(err, null);
          }
        },
        instance_id: 'i-abcd1111'
      };
      index.getInstanceMetadata(data)
        .catch(function(err) {
          assert.ok(err, 'getInstanceMetadata threw an error due to API failure');
          done();
        });
    });
  });
};

// TEST/GETINSTANCEMETADATA.JS ends here.
