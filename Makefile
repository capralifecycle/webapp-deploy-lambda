.PHONY: all
all: build

###########################
# Composite targets
# ###########################

.PHONY: build
build: install lint-fix fmt npm-build snapshots

.PHONY: ci
ci: install lint fmt-check npm-build test

.PHONY: install
install: py-install npm-install

.PHONY: lint
lint: py-lint-check npm-lint-check

.PHONY: lint-fix
lint-fix: py-lint-fix npm-lint-fix

.PHONY: fmt
fmt: py-fmt-fix npm-fmt-fix

.PHONY: fmt-check
fmt-check: py-fmt-check npm-fmt-check

.PHONY: test
test: py-test npm-test

.PHONY: snapshots
snapshots: npm-test-update

.PHONY: clean
clean: npm-clean py-clean

.PHONY: clean-all
clean-all: npm-clean-all py-clean-all


###########################
# NPM targets
###########################
.PHONY: npm-install
npm-install:
ifeq ($(CI),true)
	npm ci
else
	npm install --ignore-scripts
endif

.PHONY: npm-build
npm-build:
	npm run build

.PHONY: npm-fmt-fix
npm-fmt-fix:
	npm run fmt

.PHONY: npm-fmt-check
npm-fmt-check:
	npm run fmt:check

.PHONY: npm-upgrade-deps
npm-upgrade-deps:
	npm run upgrade-dependencies

.PHONY: npm-biome-migrate
npm-biome-migrate:
	npm run biome-migrate

.PHONY: npm-test
npm-test:
	npm run test

.PHONY: npm-test-update
npm-test-update:
	npm run test:update

.PHONY: npm-lint-check
npm-lint-check:
	npm run lint

.PHONY: npm-lint-fix
npm-lint-fix:
	npm run lint:fix

.PHONY: npm-clean
npm-clean:
	rm -rf dist/ lib/

.PHONY: npm-clean-all
npm-clean-all: npm-clean
	rm -rf node_modules/


###########################
## Python targets
###########################
.PHONY: py-install
py-install:
	uv sync

.PHONY: py-lint-check
py-lint-check:
	uv run ruff check webapp_deploy

.PHONY: py-lint-fix
py-lint-fix:
	uv run ruff check --fix webapp_deploy

.PHONY: py-fmt-fix
py-fmt-fix:
	uv run ruff format webapp_deploy

.PHONY: py-fmt-check
py-fmt-check:
	uv run ruff format --check webapp_deploy

.PHONY: py-test
py-test:
	TARGET_BUCKET_URL=s3://dummy/web \
	EXPIRE_SECONDS=86400 \
	DEPLOY_LOG_BUCKET_URL=s3://dummy/deployments.log \
	uv run python -m unittest discover webapp_deploy

.PHONY: py-clean
py-clean:
	uv run ruff clean
	uv clean

.PHONY: py-clean-all
py-clean-all: py-clean
	rm -rf venv
