import os

target_bucket_url = os.environ["TARGET_BUCKET_URL"]
deploy_log_bucket_url = os.environ["DEPLOY_LOG_BUCKET_URL"]

cf_distribution_id = os.environ.get("CF_DISTRIBUTION_ID")
exclude_pattern = os.environ.get("EXCLUDE_PATTERN", None)

if exclude_pattern == "":
    exclude_pattern = None

# Defaults to 5 days.
expire_seconds = os.environ.get("EXPIRE_SECONDS", 5 * 24 * 60 * 60)
