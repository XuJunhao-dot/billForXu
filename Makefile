# billForXu Makefile
# Usage examples:
#   make build TAG=v4
#   make push TAG=v4
#   make deploy-local TAG=v4
#   make logs

REGISTRY ?= image.ppinfra.com
NAMESPACE ?= prod-zirllhuyllegrjroryqb
REPO ?= bill
TAG ?= v4

IMAGE := $(REGISTRY)/$(NAMESPACE)/$(REPO):$(TAG)

.PHONY: help info build push pull deploy-local stop logs clean

help:
	@echo "Targets:"
	@echo "  make info                Show image name"
	@echo "  make build [TAG=...]      Build image (no cache)"
	@echo "  make push  [TAG=...]      Push image to registry"
	@echo "  make pull  [TAG=...]      Pull image from registry"
	@echo "  make deploy-local [TAG=...]  Run container locally on :8080"
	@echo "  make logs                 Tail local container logs"
	@echo "  make stop                 Stop/remove local container"
	@echo "  make clean                Prune docker caches (DANGEROUS)"

info:
	@echo $(IMAGE)

build:
	docker build --no-cache -t $(IMAGE) .

push:
	docker push $(IMAGE)

pull:
	docker pull $(IMAGE)

deploy-local:
	docker rm -f bill || true
	docker run -d --name bill -p 8080:80 $(IMAGE)
	@echo "Open: http://127.0.0.1:8080"

logs:
	docker logs -f --tail 200 bill

stop:
	docker rm -f bill || true

clean:
	@echo "Pruning builder and system cache..."
	docker builder prune -af
	docker system prune -af
