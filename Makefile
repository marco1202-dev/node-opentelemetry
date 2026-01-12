.PHONY: install build run test docker-build docker-run deploy-lambda clean

install:
	npm install
	cd lambda/log-processor && npm install

build:
	npm run build

run:
	npm start

test:
	npm test

docker-build:
	docker build -t opentelemetry-poc:latest .

docker-run:
	docker-compose up --build

docker-stop:
	docker-compose down

deploy-lambda:
	cd lambda && chmod +x deploy.sh && ./deploy.sh

package-lambda:
	cd lambda/log-processor && npm install --production
	cd lambda && zip -r ../lambda-deployment.zip log-processor/ -x "*.git*" "*.md" "*.sh" "node_modules/.cache/*"

clean:
	rm -rf node_modules
	rm -rf lambda/log-processor/node_modules
	rm -f lambda-deployment.zip
	docker-compose down -v
