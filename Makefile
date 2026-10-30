.PHONY: setup check serve train evaluate
setup:
	./scripts/setup.sh
check:
	./scripts/check.sh
serve:
	./scripts/run.sh serve --host 0.0.0.0
train:
	./scripts/run.sh train --iterations 5 --games 4 --workers 2
evaluate:
	./scripts/run.sh evaluate --games 1000
