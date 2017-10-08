# aws-lambda-ec2-dyndns

This AWS Lambda function handles CloudWatch Events signalling an EC2
instance entering the running state.  When triggered the function
checks the instance's metadata for tags that specify which Route 53
hosted zone and resource record should be updated and acts
accordingly.

## Limitations

- The function will only register the instance's public IP address in
  DNS.
