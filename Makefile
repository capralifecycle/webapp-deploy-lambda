VENV = .venv/bin

.PHONY: all
all: install-deps build fmt lint test

.PHONY: install-deps
install-deps:
	@echo "=== Running target: install-deps ==="
	npm install --ignore-scripts
	python3 -m venv .venv && \
	$(VENV)/pip install -r requirements.txt

.PHONY: build
build:
	@echo "=== Running target: build ==="
	npm run build # runs build through prepare-script

.PHONY: test
test: npm-test py-test

npm-test:
	@echo "=== Running target: npm-test ==="
	npm run test

py-test:
	@echo "=== Running target: py-test ==="
	TARGET_BUCKET_URL=s3://dummy/web \
	EXPIRE_SECONDS=86400 \
	DEPLOY_LOG_BUCKET_URL=s3://dummy/deployments.log \
	$(VENV)/python -m unittest discover webapp_deploy

.PHONY: fmt
fmt:
	npm run lint:fix
	$(VENV)/black webapp_deploy

.PHONY: npm-fmt
npm-fmt:
	@echo "=== Running target: npm-fmt ==="
	npm run format

.PHONY: py-fmt
py-fmt:
	@echo "=== Running target: py-fmt ==="
	$(VENV)/black webapp_deploy

.PHONY: lint
lint: npm-lint py-lint

.PHONY: npm-lint
npm-lint:
	@echo "=== Running target: npm-lint ==="
	npm run lint

.PHONY: py-lint
py-lint:
	@echo "=== Running target: py-lint ==="
	$(VENV)/flake8 --exclude .venv webapp_deploy
	$(VENV)/black --check webapp_deploy

.PHONY: snapshots
snapshots:
	@echo "=== Running target: snapshots ==="
	npm test -- --updateSnapshot

.PHONY: clean
clean:
	rm -rf dist/ lib/
