all:
	@echo "Specify a valid target"
	@exit 1

py-test:
	TARGET_BUCKET_URL=s3://dummy/web \
	EXPIRE_SECONDS=86400 \
	DEPLOY_LOG_BUCKET_URL=s3://dummy/deployments.log \
	python -m unittest discover webapp_deploy

py-format:
	black webapp_deploy

py-lint:
	flake8 --exclude .venv webapp_deploy
	black --check webapp_deploy
