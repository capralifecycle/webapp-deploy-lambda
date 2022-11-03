import json
import mimetypes
import os
import re
import shutil
import sys
import tarfile
import tempfile
import time
import zipfile
from botocore.exceptions import ClientError
from contextlib import closing
from webapp_deploy.cfnresponse import send, SUCCESS, FAILED

from webapp_deploy.aws import cf_client, parse_s3_url, s3_client
from webapp_deploy.config import (
    cf_distribution_id,
    deploy_log_bucket_url,
    exclude_pattern,
    expire_seconds,
    target_bucket_url,
)
from webapp_deploy.logger import logger


class DeployItem:
    def __init__(self, time, filename):
        self.time = time
        self.filename = filename

    @staticmethod
    def from_line(line):
        [time, filename] = line.rstrip("\n").split("\t", 2)
        return DeployItem(int(time), filename)

    def to_line(self):
        return "%s\t%s\n" % (self.time, self.filename)


def check_items(items, expiry):
    """
    Check for old deployments that have files that can be deleted
    and prune old deployments from the item list.

    The algorithm finds all deployments older than the expiry
    and keeps only the newest of them.

    Returns a set containing the remaining items and a list of
    files to be deleted.
    """

    deployments = list(set([i.time for i in items]))
    deployments_old = sorted([i for i in deployments if i < expiry])

    if len(deployments_old) <= 1:
        return items, []

    delete_older_than = deployments_old[-1]

    keep_files = list(set([i.filename for i in items if i.time >= delete_older_than]))

    delete_files = list(
        set(
            [
                i.filename
                for i in items
                if i.time < delete_older_than and i.filename not in keep_files
            ]
        )
    )

    return [i for i in items if i.time >= delete_older_than], delete_files


def cleanup_delete_files(s3_target, files):
    s3_target_bucket, s3_target_key = parse_s3_url(s3_target)

    objects = []
    for filename in files:
        logger.info("Deleting %s" % filename)
        objects.append({"Key": os.path.join(s3_target_key, filename)})

    result = s3_client.delete_objects(
        Bucket=s3_target_bucket, Delete={"Objects": objects}
    )
    if "Errors" in result and len(result["Errors"]) > 0:
        logger.warn("Errors during delete: %s" % result["Errors"])


def cleanup(items, s3_target, expiry):
    updated_items, delete_files = check_items(items, expiry)

    if len(delete_files) > 0:
        cleanup_delete_files(s3_target, delete_files)

    return updated_items


def get_artifact(s3_artifact, local_path):
    bucket, key = parse_s3_url(s3_artifact)

    logger.info("Downloading %s" % s3_artifact)
    s3_client.download_file(bucket, key, local_path)


def upload(bucket, files):
    for [filename, local_path, s3_key] in files:
        logger.info(
            "Uploading %s to %s" % (local_path, "s3://%s/%s" % (bucket, s3_key))
        )
        extra_args = {}
        mime_type = mimetypes.guess_type(filename)[0]
        if mime_type is not None:
            extra_args["ContentType"] = mimetypes.guess_type(filename)[0]
        s3_client.upload_file(local_path, bucket, s3_key, ExtraArgs=extra_args)


def extract(artifact_s3_url, source, dest, exclude_pattern):
    pattern_compiled = (
        re.compile(exclude_pattern) if exclude_pattern is not None else None
    )

    def handle_file(container_path, container_extract):
        name = container_path.lstrip("./")
        if pattern_compiled is not None and pattern_compiled.search(name):
            logger.info("Skipping %s" % name)
        else:
            container_extract(container_path, path=dest + "/")
            logger.info("Extracted %s" % name)

    logger.info("Extracting archive")

    if artifact_s3_url.endswith(".zip"):
        logger.info("Found zip file")
        with zipfile.ZipFile(source, "r") as zip:
            for name in zip.namelist():
                handle_file(name, zip.extract)

    elif artifact_s3_url.endswith(".tgz"):
        logger.info("Found tgz file")
        with tarfile.open(source, "r:gz") as tar:
            for tar_resource in tar:
                if tar_resource.isfile():
                    handle_file(tar_resource.name, tar.extract)

    else:
        raise Exception(f"Unsupported extension: {artifact_s3_url}")


def construct_all_files(temp_dir, s3_upload_key_base):
    all_files = []
    for root, dirs, files in os.walk(temp_dir):
        for filename in files:
            local_path = os.path.join(root, filename)
            relpath = os.path.relpath(local_path, temp_dir)
            s3_key = os.path.join(s3_upload_key_base, relpath)

            all_files.append([relpath, local_path, s3_key])

    return all_files


def deploy(artifact_s3_url, target_s3_url, exclude_pattern):
    """
    Deploys items from the S3 artifact, which should point to a .tgz
    or .zip file, to the target S3 bucket.

    Returns a list of DeployItem that were uploaded.
    """

    temp_file = tempfile.NamedTemporaryFile()
    get_artifact(artifact_s3_url, temp_file.name)

    temp_dir = tempfile.mkdtemp()

    extract(artifact_s3_url, temp_file.name, temp_dir, exclude_pattern)

    s3_upload_bucket, s3_upload_key_base = parse_s3_url(target_s3_url)

    all_files = construct_all_files(temp_dir, s3_upload_key_base)

    deploy_time = int(time.time())

    # Sync to S3 - exclude html files first, then upload the html files.
    # The ordering ensures that the dependencies are always uploaded before
    # the referencing html file. It also ensures that most failures will not
    # leave the code base in a non-working state.

    upload(s3_upload_bucket, [i for i in all_files if not i[0].endswith(".html")])
    upload(s3_upload_bucket, [i for i in all_files if i[0].endswith(".html")])

    temp_file.close()
    shutil.rmtree(temp_dir)

    return [DeployItem(deploy_time, fname) for [fname, _, _] in all_files]


def fetch_deployment_log(s3_deployments_log):
    logger.info("Fetching deployments log from %s" % s3_deployments_log)
    try:
        bucket, key = parse_s3_url(s3_deployments_log)
        res = s3_client.get_object(Bucket=bucket, Key=key)
        body = res["Body"]
        result = []
        with closing(body):
            for line in body.iter_lines():
                result.append(DeployItem.from_line(line.decode("utf-8")))
        return result

    except ClientError as e:
        # Ignore not found as it covers the initial case.
        if e.response["Error"]["Code"] != "NoSuchKey":
            raise e

        return []


def store_deployment_log(items, s3_deployments_log):
    logger.info("Uploading deployments log to %s" % s3_deployments_log)
    bucket, key = parse_s3_url(s3_deployments_log)
    s3_client.put_object(
        Bucket=bucket, Key=key, Body="".join([i.to_line() for i in items])
    )


def create_invalidation(distribution_id):
    logger.info("Creating CloudFront invalidation for %s" % distribution_id)

    ref = str(int(time.time() * 1000))
    cf_client.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            "Paths": {"Quantity": 1, "Items": ["/*"]},
            "CallerReference": ref,
        },
    )


def process(s3_artifact):
    deploy_items = fetch_deployment_log(deploy_log_bucket_url)

    deploy_items = deploy_items + deploy(
        s3_artifact, target_bucket_url, exclude_pattern
    )

    older_than = int(time.time()) - expire_seconds
    deploy_items = cleanup(deploy_items, target_bucket_url, older_than)

    store_deployment_log(deploy_items, deploy_log_bucket_url)

    if cf_distribution_id is not None:
        create_invalidation(cf_distribution_id)

    logger.info("All done")


def handler(event, context):
    response = {
        "event": event,
        "context": context,
        "responseStatus": SUCCESS,
    }

    logger.info("Cloud formation event triggered handler: %s" % json.dumps(event))
    logger.info("Starting processing")
    if event["RequestType"] in ("Update", "Create"):
        try:
            process(event["ResourceProperties"]["artifactS3Url"])
        except Exception:
            logger.exception(
                "An unexpected error occurred - marking the deployment as a failure"
            )
            response = {
                **response,
                "responseStatus": FAILED,
            }
        send(**response)
    else:
        logger.info(
            "Event type is %s. Nothing is done for this event type."
            % event["RequestType"]
        )
        try:
            send(**response)
        except Exception:
            logger.exception(
                "Could not send response for event type %s" % event["RequestType"]
            )


if __name__ == "__main__":
    if len(sys.argv) <= 1:
        print("Missing argument with S3 path of artifact file")
        sys.exit(1)

    process(sys.argv[1])
