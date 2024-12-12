import { $ } from 'bun'
import { loadEnv, printInfo, printSuccess, printError, printWarning } from './utils.js'

const prompt = async (question) => {
	process.stdout.write(question)
	for await (const line of console) {
		return line.trim()
	}
}

const setupEnv = async (env, useKubernetes = false) => {
	printInfo(`Setting up ${env} environment...`)

	const envVars = await loadEnv(env)
	Object.assign(process.env, envVars)

	printInfo(`Loaded environment variables for ${env}`)

	if (env === 'dev') {
		if (useKubernetes) {
			await setupDevKubernetes()
		} else {
			await setupDevDocker()
		}
	} else if (['ptu', 'live'].includes(env)) {
		await setupKubernetes(env)
	} else {
		printError("Invalid environment. Use 'dev', 'ptu', or 'live'.")
		process.exit(1)
	}

	printSuccess(`${env} environment setup completed`)
}

const setupDevDocker = async () => {
	printInfo('Setting up dev environment with Docker Compose')
	try {
		// Create traefik network
		const traeficNetwork = 'traefik-public'
		printInfo(`Ensuring ${traeficNetwork} network exists...`)
		try {
			await $`docker network create ${traeficNetwork}`.quiet()
			printSuccess(`${traeficNetwork} network created`)
		} catch (_error) {
			printInfo(`${traeficNetwork} network already exists`)
		}

		// Start Docker Compose services
		printInfo('Starting Docker Compose services...')
		const result = await $`docker-compose -f docker/docker-compose.yml up -d`
		printInfo(`Docker Compose output: ${result.stdout}`)
		printSuccess('Docker Compose services started')
	} catch (error) {
		printError(`Error setting up Docker environment: ${error.message}`)
		process.exit(1)
	}
}

const setupDevKubernetes = async () => {
	printInfo('Configurando el entorno de desarrollo con Minikube')
	try {
		await $`minikube start`

		// Instalar Traefik CRDs
		printInfo('Instalando Traefik CRDs')
		await $`kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v2.10/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml`

		// Esperar un momento para que los CRDs se instalen
		await new Promise((resolve) => setTimeout(resolve, 5000))

		// Construir la imagen de auth-service directamente en Minikube
		printInfo('Construyendo la imagen de auth-service en Minikube')
		await $`minikube image build -t auth-service:latest ../auth-service`

		// Aplicar las configuraciones de Kubernetes en orden
		printInfo('Aplicando configuraciones...')
		await $`kubectl apply -f kubernetes/dev/configmap.yaml`
		await $`kubectl apply -f kubernetes/dev/secret.yaml`
		await $`kubectl apply -f kubernetes/dev/traefik-rbac.yaml`
		await $`kubectl apply -f kubernetes/dev/traefik.yaml`

		// Esperar a que Traefik esté listo
		printInfo('Esperando a que Traefik esté listo...')
		await $`kubectl wait --for=condition=ready pod -l app=traefik --timeout=120s`

		// Aplicar el resto de los servicios
		await $`kubectl apply -f kubernetes/dev/postgres-auth.yaml`
		await $`kubectl apply -f kubernetes/dev/auth-service.yaml`

		// Esperar a que los servicios estén listos
		printInfo('Esperando a que los servicios estén listos...')
		await $`kubectl wait --for=condition=ready pod -l app=postgres-auth --timeout=120s`
		await $`kubectl wait --for=condition=ready pod -l app=auth-service --timeout=120s`

		// Mostrar estado de los IngressRoutes
		printInfo('\nEstado de los IngressRoutes:')
		await $`kubectl get ingressroute,ingressroutetcp`

		// Mostrar estado de los pods
		printInfo('\nEstado de los pods:')
		await $`kubectl get pods`

		// Obtener la URL de Traefik
		printInfo('Exponiendo Traefik')
		await $`minikube service traefik --url`
	} catch (error) {
		printError(`Error al configurar el entorno de desarrollo de Kubernetes: ${error.message}`)
		process.exit(1)
	}
}

const setupKubernetes = async (env) => {
	printInfo(`Setting up ${env} environment with Kubernetes`)
	try {
		await $`kubectl create secret generic voxelheim-${env}-env --from-env-file=env/.env.${env} -o yaml --dry-run=client | kubectl apply -f -`
		await $`envsubst < kubernetes/${env}/auth-service.yaml | kubectl apply -f -`
		printSuccess(`Kubernetes ${env} environment set up`)
	} catch (error) {
		printError(`Error setting up Kubernetes ${env} environment: ${error.message}`)
		process.exit(1)
	}
}

const runMigrations = async (env) => {
	try {
		await $`bun run scripts/runMigrations.js ${env}`
		printSuccess(`Migrations for ${env} environment completed`)
	} catch (error) {
		printError(`Error running migrations for ${env} environment: ${error.message}`)
	}
}

const askToRunMigrations = async (env) => {
	const answer = await prompt(`Do you want to run migrations for the ${env} environment? (y/n): `)
	return answer.toLowerCase() === 'y'
}

const main = async () => {
	const args = process.argv.slice(2)
	const env = args[0]
	const useKubernetes = args[1] === 'true'

	if (!['dev', 'ptu', 'live'].includes(env)) {
		printError("Invalid environment. Use 'dev', 'ptu', or 'live'.")
		process.exit(1)
	}

	try {
		await setupEnv(env, useKubernetes)

		const shouldRunMigrations = await askToRunMigrations(env)
		if (shouldRunMigrations) {
			await runMigrations(env)
		} else {
			printWarning('Skipping migrations')
		}

		printSuccess(`Setup for ${env} environment completed successfully`)
	} catch (error) {
		printError(`Unhandled error: ${error.message}`)
		process.exit(1)
	}
}

main().catch((error) => {
	printError(`Unhandled error: ${error.message}`)
	process.exit(1)
})
