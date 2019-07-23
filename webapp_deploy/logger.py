import logging
from webapp_deploy.aws import is_aws

if is_aws:
    logging.basicConfig(
        format="[%(levelname)s]\t%(asctime)s.%(msecs)dZ\t%(aws_request_id)s\t%(name)s\t%(message)s\n"
    )
else:
    logging.basicConfig(format="[%(levelname)s] %(asctime)s - %(name)s - %(message)s")

root = logging.getLogger()
root.setLevel(logging.INFO)

logger = logging.getLogger("webapp_deploy")
logger.setLevel(logging.DEBUG)
