// Entry point for `azd provision` / `azd up`: creates the resource group and deploys
// resources.bicep into it. Parameter values come from main.parameters.json, which azd
// fills from the environment (.azure/<env>/.env).
targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('azd environment name, e.g. meridian-dev. Used in resource names and tags.')
param environmentName string

@minLength(1)
@description('Azure region for all resources.')
param location string

@description('Existing Azure AI Services (OpenAI) account the API calls. Its key is read at deploy time.')
param aoaiAccountName string = 'jacqueslouisdutoit7-135-resource'

@description('Resource group of that existing account.')
param aoaiResourceGroup string = 'rg-jacqueslouisdutoit7-4626'

@description('Chat deployment name inside the AI Services account.')
param aoaiChatDeployment string = 'gpt-5-mini'

@description('Embedding deployment name inside the AI Services account.')
param aoaiEmbeddingDeployment string = 'text-embedding-3-large'

@description('One public IPv4 CIDR allowed to reach the API (e.g. 203.0.113.7/32). Empty = open to the internet.')
param allowedIpRange string = ''

@secure()
@minLength(32)
@description('Shared secret every API request must send as X-API-Key (ADR 016). From azd env API_ACCESS_KEY.')
param apiAccessKey string

var tags ={ 'azd-env-name': environmentName }

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

module resources 'resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    location: location
    tags: tags
    environmentName: environmentName
    aoaiAccountName: aoaiAccountName
    aoaiResourceGroup: aoaiResourceGroup
    aoaiChatDeployment: aoaiChatDeployment
    aoaiEmbeddingDeployment: aoaiEmbeddingDeployment
    allowedIpRanges: empty(allowedIpRange) ? [] : [ allowedIpRange ]
    apiAccessKey: apiAccessKey
  }
}

// azd reads these outputs: the registry for the remote build, the app URL for display.
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resources.outputs.registryLoginServer
output SERVICE_API_NAME string = resources.outputs.apiName
output SERVICE_API_URI string = resources.outputs.apiUri
