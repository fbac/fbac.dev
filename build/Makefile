.PHONY: build clean push serve upgrade

publish: clean build push

build:
	cobalt build --silent

clean:
	cobalt clean --silent

push:
	git add -A .
	git commit -m "$(date) publish changes"
	git push

serve:
	cobalt serve

upgrade:
	curl -LSfs https://japaric.github.io/trust/install.sh | sh -s -- --force --git cobalt-org/cobalt.rs --crate cobalt
