// Resource-group resources for the Meridian FastAPI container on Azure Container Apps.
//
// Design constraints carried over from the ADRs:
// - ADR 008: SQLite has one writer, so min = max = 1 replica. The draft queue lives on
//   the container's own disk and is lost on restart or a new revision (demo only;
//   durable storage means Postgres, not an SMB share, because SQLite WAL is unsafe there).
// - Secrets: the Azure OpenAI key is read with listKeys() from the existing AI Services
//   account and stored as a Container Apps secret; it never appears in the repo or .env.
// - Streamlit is not deployed; the local UI points FRICTION_GATE_API_URL at this app.

param location string
param tags object
param environmentName string
param aoaiAccountName string
param aoaiResourceGroup string
param aoaiChatDeployment string
param aoaiEmbeddingDeployment string
param allowedIpRanges array
@secure()
param apiAccessKey string

var resourceToken = toLower(uniqueString(subscription().id, resourceGroup().id, environmentName))
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d' // built-in AcrPull

resource logs 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${resourceToken}'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'cr${resourceToken}'
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

// Identity the container app uses to pull its image (no registry passwords).
resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-api-${resourceToken}'
  location: location
  tags: tags
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, pullIdentity.id, acrPullRoleId)
  scope: registry
  properties: {
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
  }
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${resourceToken}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource aoai 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: aoaiAccountName
  scope: resourceGroup(aoaiResourceGroup)
}

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-api-${resourceToken}'
  location: location
  // azd finds the app to deploy to by this tag (service name in azure.yaml).
  tags: union(tags, { 'azd-service-name': 'api' })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${pullIdentity.id}': {} }
  }
  dependsOn: [ acrPull ]
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        ipSecurityRestrictions: [for (cidr, i) in allowedIpRanges: {
          name: 'allow-${i}'
          ipAddressRange: cidr
          action: 'Allow'
        }]
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
      secrets: [
        {
          name: 'aoai-key'
          value: aoai.listKeys().key1
        }
        {
          name: 'api-access-key'
          value: apiAccessKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          // Placeholder until `azd deploy` pushes the real image built from ./Dockerfile.
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'AZURE_OPENAI_ENDPOINT', value: 'https://${aoaiAccountName}.openai.azure.com' }
            { name: 'AZURE_OPENAI_API_KEY', secretRef: 'aoai-key' }
            { name: 'AZURE_OPENAI_DEPLOYMENT', value: aoaiChatDeployment }
            { name: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT', value: aoaiEmbeddingDeployment }
            { name: 'ENVIRONMENT', value: 'azure-container-apps' }
            // ADR 016: the IP allow-list narrows who can connect; this key decides who is let in.
            { name: 'API_ACCESS_KEY', secretRef: 'api-access-key' }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

output registryLoginServer string = registry.properties.loginServer
output apiName string = api.name
output apiUri string = 'https://${api.properties.configuration.ingress.fqdn}'
