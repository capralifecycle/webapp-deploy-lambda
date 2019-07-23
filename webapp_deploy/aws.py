import os
from urllib.parse import urlparse

import boto3

s3_client = boto3.client("s3")
cf_client = boto3.client("cloudfront")

is_aws = os.environ.get("AWS_EXECUTION_ENV") is not None


def parse_s3_url(s3_url):
    """
    Returns a tuple containing the bucket name and the key.
    """
    parsed = urlparse(s3_url, allow_fragments=False)
    return parsed.netloc, parsed.path.lstrip("/")
