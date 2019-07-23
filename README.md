# Lambda for deploying a webapp release

This project contains code for an AWS Lambda Function to handle
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
longer have any refrence to them.

## Lambda configuration

Required environment variables:

- `TARGET_BUCKET_URL`. A full S3 url with the directory files should be
  deployed to. E.g. `s3://my-bucket` or `s3://my-bucket/web`.
- `DEPLOY_LOG_BUCKET_URL`. A full S3 url for a object that will hold
  the deployment log file. E.g. `s3://my-bucket/deployments.log`.
- `CF_DISTRIBUTION_ID`. Optional. A CloudFront distribution URL that will be
  invalidated after deploy.
- `EXCLUDE_PATTERN`. Optional. A regex. If a search using this regex
  matches a filename, it will be excluded. Example: `\.map$` will exclude
  `js/myapp-1b22c248f.js.map`.
- `EXPIRE_SECONDS`. Optional. The time when a deployment is considered old
  and will be deleted unless it is the newest old deployment. Defaults
  to five days.

## Executing the lambda

The handler should be set to `webapp_deploy.main.handler`.

After setting up your lambda, you can invoke it like this:

```bash
aws lambda invoke \
  --function-name my-deploy-lambda \
  --payload '{
    "artifactS3Url": "s3://my-bucket/my-release.tgz"
  }' \
  /tmp/out.log
```

## Permissions

Example IAM policy that shows the required permissions:

```yaml
PolicyDocument:
  Version: 2012-10-17
  Statement:
    - Effect: Allow
      Action:
        - s3:HeadObject
        - s3:GetObject
      Resource: arn:aws:s3:::ARTIFACTS_BUCKET/*
    - Effect: Allow
      Action:
        - s3:PutObject
        - s3:DeleteObject
      Resource: arn:aws:s3:::DEPLOYED_BUCKET/*
    - Effect: Allow
      Action:
        - s3:GetObject
        - s3:PutObject
      Resource: arn:aws:s3:::DEPLOYMENT_LOG_BUCKET/*
    - Effect: Allow
      Action:
        - cloudfront:CreateInvalidation
      Resource: '*' # Cannot be restricted
```

## Development

Testing locally:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Adjust to your project.
export TARGET_BUCKET_URL=s3://my-website/web
export DEPLOY_LOG_BUCKET_URL=s3://my-website/deployments.log
export CF_DISTRIBUTION_ID=EKJ2IPY1KTEAR1

# Adjust artifact path.
python -m webapp_deploy.lambda s3://my-bucket/my-release.tgz
```

## Notes

- To avoid a race condition in using and updating the deployment log, no
  concurrent execution of the lambda should be allowed.

- As we use S3 to hold the deployment log, there is a potential for a
  successive deployment to read an older deployment log. This is due
  to the fact that S3 is eventually consistent. If this happens the files
  that were deployed by the previous run (being overwritten) will
  be kept forver.
