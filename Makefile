dev:        ## Boot api + worker + web locally
	docker compose -f infra/docker/docker-compose.yml up
book:       ## make book COUNTRY=ethiopia AGE=0-3 CONCEPT="first-words"
	pnpm new:book --country $(COUNTRY) --age $(AGE) --concept "$(CONCEPT)"
ship:       ## Run full pre-publish: compliance + qa gates
	pnpm -w run e2e
