# CDK Construct for deploying a webapp release

This project contains a CDK Construct for an AWS Lambda Function to handle
deployment of a bundled static web application to a S3 bucket
while preserving files from previous deployments within a time
threshold.

What it does:

1. Fetch deployment log from S3
1. Fetch bundled artifact and extract locally with optional filtering
1. Upload all non-html files to S3
1. Upload html files to S3
1. Add uploaded items to deployment log
1. Delete old items from S3
1. Prune old deployments from deployment log
1. Store deployment log to S3 for next run
1. Optionally invalidate CloudFront distribution

## Preserving old files

A single-page application using code splitting will cause the client to
defer loading lots of files. To avoid a deployment disrupting the user, we
cannot delete the previous files (e.g. using `aws s3 sync --delete`), as
that would cause the client to get 404 errors when navigating through the app.
CloudFront will in many cases hide this issue for most of the users due to
its edge caches, but it will still be an issue for users that haven't
updated the application since the day before.

One way of handling this would be to never delete any files from the
S3 bucket. That means the bucket will fill up with a lot of old files.
This project approaches it differently by deleting old files.

A user that still uses an application deployed five days ago should not
be disrupted. To keep this promise we keep the newest deployment that
happened more than five days ago, and delete files from older ones that no
longer have any reference to them.

## Triggering a deployment

```bash
aws lambda invoke \
  --function-name my-deploy-lambda \
  --payload '{
    "ResourceProperties": {
      "artifactS3Url": "s3://my-bucket/my-release.tgz"
    }, 
    "RequestType": "Update"
  }' \
  /tmp/out.log
```

## Development

Testing locally:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Adjust to your project. See config.py for full list.
export TARGET_BUCKET_URL=s3://my-website/web
export EXPIRE_SECONDS=86400
export DEPLOY_LOG_BUCKET_URL=s3://my-website/deployments.log
export CF_DISTRIBUTION_ID=EKJ2IPY1KTEAR1

# Adjust artifact path.
python -m webapp_deploy.main s3://my-bucket/my-release.tgz
```

## Notes

- To avoid a race condition in using and updating the deployment log, no
  concurrent execution of the lambda should be allowed.
