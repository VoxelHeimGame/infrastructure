import { $, file } from 'bun'
import { loadEnv, printInfo, printSuccess, printError } from './utils.js'

const deploy = async (env, useKubernetes = false) => {
	printInfo(`Deploying to ${env} environment...`)

	const envVars = await loadEnv(env)
	Object.assign(process.env, envVars)

	if (env === 'dev') {
		if (useKubernetes) {
			await deployDevKubernetes()
		} else {
			await deployDevDocker()
		}
	} else if (['ptu', 'live'].includes(env)) {
		await deployKubernetes(env)
	} else {
		printError("Invalid environment. Use 'dev', 'ptu', or 'live'.")
		process.exit(1)
	}

	printSuccess(`Deployment to ${env} completed`)
}

const deployDevDocker = async () => {
	printInfo('Deploying to development environment with Docker Compose')
	try {
		await $`docker-compose -f docker/docker-compose.yml up -d --build`
		printSuccess('Docker Compose services updated and restarted')
	} catch (error) {
		printError(`Error deploying with Docker Compose: ${error.message}`)
		process.exit(1)
	}
}

const deployDevKubernetes = async () => {
	printInfo('Deploying to development environment with Minikube')
	try {
		await $`minikube start`
		await $`kubectl create configmap voxelheim-dev-env --from-env-file=env/.env.dev -o yaml --dry-run=client | kubectl apply -f -`
		await $`envsubst < kubernetes/dev/auth-service.yaml | kubectl apply -f -`
		printSuccess('Kubernetes configurations applied')
	} catch (error) {
		printError(`Error deploying to Minikube: ${error.message}`)
		process.exit(1)
	}
}

const deployKubernetes = async (env) => {
	printInfo(`Deploying to ${env} environment with Kubernetes`)
	try {
		await $`kubectl create secret generic voxelheim-${env}-env --from-env-file=env/.env.${env} -o yaml --dry-run=client | kubectl apply -f -`
		await $`envsubst < kubernetes/${env}/auth-service.yaml | kubectl apply -f -`
		printSuccess('Kubernetes configurations applied')
	} catch (error) {
		printError(`Error deploying to Kubernetes: ${error.message}`)
		process.exit(1)
	}
}

const main = async () => {
	const args = process.argv.slice(2)
	const env = args[0]
	const useKubernetes = args[1] === 'true'

	await deploy(env, useKubernetes)
}

main().catch((error) => {
	printError(`Unhandled error: ${error.message}`)
	process.exit(1)
})
