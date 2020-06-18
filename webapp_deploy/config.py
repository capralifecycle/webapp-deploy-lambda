import os

expire_seconds = os.environ["EXPIRE_SECONDS"]
target_bucket_url = os.environ["TARGET_BUCKET_URL"]
deploy_log_bucket_url = os.environ["DEPLOY_LOG_BUCKET_URL"]

cf_distribution_id = os.environ.get("CF_DISTRIBUTION_ID")
exclude_pattern = os.environ.get("EXCLUDE_PATTERN")
