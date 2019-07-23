all:
	@echo "Specify a valid target"
	@exit 1

build:
	./build.sh

test:
	TARGET_BUCKET_URL=s3://dummy/web \
	DEPLOY_LOG_BUCKET_URL=s3://dummy/deployments.log \
	python -m unittest discover webapp_deploy

format:
	black webapp_deploy

lint:
	flake8 --exclude .venv webapp_deploy
	black --check webapp_deploy
