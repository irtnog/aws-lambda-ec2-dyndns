// INDEX.JS --- Update the corresponding DNS A RR in Route 53 when an EC2 instance starts

// Copyright 2017, Matthew X. Economou <xenophon@irtnog.org>
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

// This file installs an AWS Lambda function that handles CloudWatch
// Events signalling an EC2 instance entering the running state.  When
// triggered the function checks the instance's metadata for tags that
// specify which Route 53 hosted zone and resource record should be
// updated and acts accordingly.  The key words "MUST", "MUST NOT",
// "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT",
// "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
// interpreted as described in RFC 2119,
// https://tools.ietf.org/html/rfc2119.  The key words "MUST (BUT WE
// KNOW YOU WON'T)", "SHOULD CONSIDER", "REALLY SHOULD NOT", "OUGHT
// TO", "WOULD PROBABLY", "MAY WISH TO", "COULD", "POSSIBLE", and
// "MIGHT" in this document are to be interpreted as described in RFC
// 6919, https://tools.ietf.org/html/rfc6919.  The keywords "DANGER",
// "WARNING", and "CAUTION" in this document are to be interpreted as
// described in OSHA 1910.145,
// https://www.osha.gov/pls/oshaweb/owadisp.show_document?p_table=standards&p_id=9794.

'use strict';

var AWS = require('aws-sdk');

console.log('AWS Lambda Dynamic DNS Client for EC2 Instances // @irtnog // Version 0.0.1');

var defaultConfig = {
  zoneid_tag: 'dyndns:zoneid',
  hostname_tag: 'dyndns:hostname',
  rr_ttl_tag: 'dyndns:rr-ttl',
  default_ttl: 300
};

// Parses the event record.
//
// @param {object} data - Data bundle with context, etc.
//
// @return {object} - Promise resolved with data.
exports.parseEvent = function(data) {
  // Validate characteristics of an EC2 event.
  if (!data.event ||
      !data.event.hasOwnProperty('source') ||
      data.event.source !== 'aws.ec2' ||
      data.event.version !== '0' ||
      data.event['detail-type'] !== 'EC2 Instance State-change Notification' ||
      !data.event.hasOwnProperty('detail') ||
      !data.event.detail.hasOwnProperty('instance-id') ||
      data.event.detail.state !== 'running') {
    data.log({message: 'parseEvent() received invalid EC2 Instance State-change Notification: ',
              level: 'error', event: JSON.stringify(data.event)});
    return Promise.reject(new Error('Error: Received invalid EC2 Instance State-change Notification.'));
  }
  data.instance_id = data.event.detail['instance-id'];
  return Promise.resolve(data);
};

// Retrieves the instance's metadata only if it has at least the
// zoneid and hostname tags
//
// @param {object} data - Data bundle with context, etc.
//
// @return {object} - Promise resolved with data.
exports.getInstanceMetadata = function(data) {
  var params = {
    Filters: [{
      Name: 'tag-key',
      Values: [
        data.config.zoneid_tag,
        data.config.hostname_tag
      ]
    }],
    InstanceIds: [
      data.instance_id
    ]
  };
  data.log({level: 'info', message: 'getInstanceMetadata: Retrieving instance tags and IP address. ' +
            'Instance ID: ' + data.instance_id + '. ' +
            'Zone ID tag: ' + data.config.zoneid_tag + '. ' +
            'Hostname tag: ' + data.config.hostname_tag + '.'});
  return new Promise(function(resolve, reject) {
    data.ec2.describeInstances(params, function(err, result) {
      if (err) {
        data.log({level: 'error', message: 'describeInstances() returned an error.',
                  error: err, stack: err.stack});
        return reject(new Error('Error: Instance metadata query failed.'));
      }
      if (result.Reservations == []) {
        data.log({level: 'error', message: 'describeInstances() returned nothing.'});
        return reject(new Error('Error: Instance ' + data.instance_id +
                                ' is not configured for dynamic DNS updates.'));
      }
      data.log({level: 'info', message: 'describeInstances() called successfully.',
                result: JSON.stringify(result)});
      data.ip_address = result.Reservations[0].Instances[0].PublicIpAddress;
      data.rr_ttl = data.config.default_ttl;
      result.Reservations[0].Instances[0].Tags.forEach(function(tag) {
        if (tag.Key == data.config.zoneid_tag) {
          data.zoneid = tag.Value;
        }
        if (tag.Key == data.config.hostname_tag) {
          data.hostname = tag.Value;
        }
        if (tag.Key == data.config.rr_ttl_tag) {
          data.rr_ttl = parseInt(tag.Value);
        }
      });
      resolve(data);
    });
  });
};

// Create/update a DNS resource record in the specified hosted zone.
//
// @param {object} data - Data bundle with context, etc.
//
// @return {object} - Promise resolved with data.
exports.updateZoneData = function(data) {
  var params = {
    ChangeBatch: {
      Changes: [{
        Action: 'UPSERT',
        ResourceRecordSet: {
          Name: data.hostname,
          Type: 'A',
          TTL: data.rr_ttl,
          ResourceRecords: [{
            Value: data.ip_address
          }]
        }
      }]
    },
    HostedZoneId: data.zoneid
  };
  data.log({level: 'info', message: 'updateZoneData: Creating/updating DNS resource record. ' +
            'Hosted Zone ID: ' + data.zoneid + '. ' +
            'Hostname: ' + data.hostname + '. ' +
            'IP Address: ' + data.ip_address + '. ' +
            'Record TTL: ' + data.rr_ttl + '.'});
  return new Promise(function(resolve, reject) {
    data.route53.changeResourceRecordSets(params, function(err, result) {
      if (err) {
        data.log({level: 'error', message: 'changeResourceRecordSets() returned an error.',
                  error: err, stack: err.stack });
        return reject(new Error('Error: DNS zone data update failed.'));
      }
      data.log({level: 'info', message: 'changeResourceRecordSets() completed successfully.',
                result: JSON.stringify(result)});
      resolve(data);
    });
  });
};

// Handler function to be invoked by AWS Lambda with an EC2 Instance
// State-change notification as the event.
//
// @param {object} event - Lambda event from EC2.
// @param {object} context - Lambda context object.
// @param {object} callback - Lambda callback object.
// @param {object} overrides - Overrides for the default data,
// including the configuration, EC2 object, and Route53 object.
exports.handler = function(event, context, callback, overrides) {
  var steps = overrides && overrides.steps ? overrides.steps : [
    exports.parseEvent,
    exports.getInstanceMetadata,
    exports.updateZoneData
  ];
  var data = {
    event: event,
    context: context,
    callback: callback,
    config: overrides && overrides.config ? overrides.config : defaultConfig,
    log: overrides && overrides.log ? overrides.log : console.log,
    ec2: overrides && overrides.ec2 ? overrides.ec2 : new AWS.EC2(),
    route53: overrides && overrides.route53 ? overrides.route53 : new AWS.Route53()
  };
  Promise.series(steps, data)
    .then(function(data) {
      data.log({level: 'info', message: 'Process finished successfully.'});
      return data.callback();
    })
    .catch(function(err) {
      data.log({level: 'error', message: 'Step returned error: ' + err.message, error: err, stack: err.stack});
      return data.callback(new Error('Error: Step returned error.'));
    });
};

Promise.series = function(promises, initValue) {
  return promises.reduce(function(chain, promise) {
    if (typeof promise !== 'function') {
      return Promise.reject(new Error("Error: Invalid promise item: " + promise));
    }
    return chain.then(promise);
  }, Promise.resolve(initValue));
};

// INDEX.JS ends here.
