const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { unmarshall, marshall } = require('@aws-sdk/util-dynamodb');
const { CacheClient, CredentialProvider, Configurations, CacheGet } = require('@gomomento/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const metrics = new Metrics({ namespace: 'Momento', serviceName: 'pizza-tracker' });
const ddb = new DynamoDBClient();
const secrets = new SecretsManagerClient();
let cacheClient;

exports.handler = async (event) => {
  try {
    await initializeMomento();
    const start = new Date();
    const ipAddress = event.requestContext.identity.sourceIp;

    const cacheResult = await cacheClient.get('pizza', ipAddress);
    if(cacheResult instanceof CacheGet.Hit){
      return {
        statusCode: 200,
        body: cacheResult.valueString(),
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    }

    const results = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'type',
      KeyConditionExpression: '#type = :type and #creator = :creator',
      ExpressionAttributeNames: {
        '#type': 'type',
        '#creator': 'creator'
      },
      ExpressionAttributeValues: marshall({
        ':type': 'order',
        ':creator': ipAddress
      })
    }));

    const orders = [];
    results.Items.map(item => {
      const data = unmarshall(item);
      orders.push({
        id: data.pk,
        createdAt: data.createdAt,
        status: data.status,
        numItems: data.numItems,
        ...data.lastUpdated && { lastUpdated: data.lastUpdated }
      })
    });
    
    const myOrders = JSON.stringify(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    await cacheClient.set('pizza', ipAddress, myOrders);

    metrics.addMetric('get-my-orders-latency', MetricUnits.Milliseconds, (new Date().getTime() - start.getTime()));
    metrics.publishStoredMetrics();
    
    return {
      statusCode: 200,
      body: myOrders,
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    }
  }
};

const initializeMomento = async () => {
  if(cacheClient){
    return;
  }

  const secretResponse = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ID }));
  const secret = JSON.parse(secretResponse.SecretString);
  cacheClient = new CacheClient({
    configuration: Configurations.Laptop.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento }),
    defaultTtlSeconds: 60
  });  
};
