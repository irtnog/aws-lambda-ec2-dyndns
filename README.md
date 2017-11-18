# aws-lambda-ec2-dyndns

[![npm version](https://badge.fury.io/js/%40irtnog%2Faws-lambda-ec2-dyndns.svg)](https://badge.fury.io/js/%40irtnog%2Faws-lambda-ec2-dyndns)
[![Travis CI test status](https://travis-ci.org/irtnog/aws-lambda-ec2-dyndns.svg?branch=master)](https://travis-ci.org/irtnog/aws-lambda-ec2-dyndns)
[![Coverage Status](https://coveralls.io/repos/github/irtnog/aws-lambda-ec2-dyndns/badge.svg?branch=master)](https://coveralls.io/github/irtnog/aws-lambda-ec2-dyndns?branch=master)

This AWS Lambda function handles CloudWatch Events signalling an EC2
instance entering the running state.  When triggered the function
checks the instance's metadata for tags that specify which Route 53
hosted zone and resource record should be updated and acts
accordingly.

## Limitations

- The function will only register the instance's public IP address in
  DNS.
